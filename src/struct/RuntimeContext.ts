import execa from "execa";
import merge from "deepmerge";
import path from "path";

import type { Logger } from "winston";

import { getFileContents } from "../utils/FileUtil";
import * as config from "../config";
import loggerBase from "../logger";
import type {
  ActionArgumentValues,
  ArgumentType,
} from "../types/ActionArgument";
import type { ConfigFile, ConfigFiles } from "../types/ConfigFile";
import type { RuntimeConfig } from "../types/RuntimeConfig";

const logger = loggerBase.child({ component: "conntext" });

const overwriteMerge = (
  destinationArray: any[],
  sourceArray: any[],
  options: any
) => ([] as any[]).concat(destinationArray, sourceArray);

/**
 * Utility functions available for re-use by implementations
 */
export interface RuntimeContextUtil {
  /**
   * Revursively merges objects
   */
  merge: (...args: Object[]) => Object;
}

/**
 * Holds volatile run-time information that needs to be persisted when creating
 * a script-proxy file.
 */
export interface FrozenRuntimeContext {
  args: any;
  env: Record<string, string>;
  filePaths: Record<string, string>;
  dirs: Record<string, string>;
  options: RuntimeConfig;
}

/**
 * Runtime context of eilos, passed around as arguments to build actions
 */
export class RuntimeContext<
  Config extends RuntimeConfig = RuntimeConfig,
  Args extends ActionArgumentValues = {},
  Files extends ConfigFiles<Config, Args> = ConfigFiles<
    Config,
    Args,
    { [K: string]: any }
  >
> {
  readonly util: RuntimeContextUtil;
  readonly logger: Logger;

  private _args: Args;
  private _dir: Record<string, string>;
  private _env: Record<string, string>;
  private _filePathOverrides: Record<string, string>;
  private _options_files: Record<string, ConfigFile | null>;
  private _options: Config;
  private _usedFiles: Set<string>;

  constructor(env: Record<string, string>, dir: Record<string, string>) {
    this.util = {
      merge: (...args: Object[]) =>
        merge.all(args, { arrayMerge: overwriteMerge }),
    };
    this._env = env;
    this._dir = dir;
    this._options = {} as Config;
    this._options_files = {} as Record<string, ConfigFile | null>;
    this._filePathOverrides = {};
    this._args = {} as Args;
    this._usedFiles = new Set();
    this.logger = logger;
  }

  /**
   * Freeze the dynamic information so they can be restored later
   */
  freeze(): FrozenRuntimeContext {
    return {
      args: this._args,
      env: this._env,
      filePaths: this._filePathOverrides,
      dirs: this._dir,
      options: {
        argv: this._options.argv,
        debug: this._options.debug,
        logLevel: this._options.logLevel,
        action: this._options.action,
      },
    };
  }

  /**
   * Thaws the local context by merging the given information
   * @param context the frozen context info
   */
  thaw(frozen: FrozenRuntimeContext) {
    if (frozen.args) {
      this.updateArgs(frozen.args);
    }
    if (frozen.options) {
      this.updateOptions(frozen.options as any);
    }
    if (frozen.filePaths) {
      this._filePathOverrides = Object.assign({}, frozen.filePaths);
    }
    if (frozen.env) {
      for (const key in frozen.env) {
        (this._env as any)[key] = frozen.env[key];
      }
    }
    if (frozen.dirs) {
      for (const key in frozen.dirs) {
        (this._dir as any)[key] = frozen.dirs[key];
      }
    }
  }

  /**
   * Checks if node environment is configured for development
   */
  isDevelop(): boolean {
    return this.getMode() === "development";
  }

  /**
   * Checks if node environment is configured for production
   */
  isProduction(): boolean {
    return this.getMode() === "production";
  }

  /**
   * Returns the build mode configuration as specified by NODE_ENV
   */
  getMode(): string {
    return this._env.NODE_ENV || "development";
  }

  /**
   * Update all the arguments in the context
   * @param args the arguments to update
   */
  updateArgs(args: Partial<Args>) {
    Object.assign(this._args, args);
  }

  /**
   * Return the value for the argument with the given name
   * @param name the name of the argument
   * @param defaultValue the default value if the argument is missing
   */
  getArg<A extends keyof Args>(name: A): ArgumentType<Args[A]> | undefined;
  getArg<A extends keyof Args>(name: A, defaultValue?: Args[A]): Args[A];
  getArg<A extends keyof Args>(
    name: A,
    defaultValue?: Args[A]
  ): Args[A] | undefined {
    return this._args[name] == null ? defaultValue : this._args[name];
  }

  /**
   * Define a directory variable that can be later fetched from 'getDirectory'
   */
  setDirectory(alias: string, path: string): this {
    this._dir[alias] = path;
    return this;
  }

  /**
   * Return a directory, previously defined by `setDirectory`
   *
   * @throws {Error} if directory is not defined
   */
  getDirectory(alias: string): string {
    if (this._dir[alias] == null) {
      throw new Error(`Directory "${alias}" was not defined`);
    }
    return this._dir[alias];
  }

  /**
   * Update run-time configuration
   */
  updateOptions(obj: Partial<Config>): void {
    this._options = merge(this._options, obj, { arrayMerge: overwriteMerge });
  }

  /**
   * Return section from the run-time configuration
   */
  getOption<K extends keyof Config>(name: K): Config[K];
  getOption<K extends keyof Config>(
    name: K,
    defaults: Config[K]
  ): Exclude<Config[K], undefined>;
  getOption<K extends keyof Config>(
    name: K,
    defaults?: Config[K]
  ): Config[K] | undefined {
    const value = this._options[name];
    if (typeof value === "object" && value && !Array.isArray(value)) {
      return Object.assign({}, defaults, value);
    } else {
      return value || defaults;
    }
  }

  /**
   * Returns the full path to the configuration file from within the config folder
   * @param name
   */
  getConfigFilePath<K extends keyof Files>(name: K): string {
    this._usedFiles.add(name as string);
    if (this._options_files[name as string] == null) {
      // Mark this as `null` indicating that there was a request to process
      // that file, but the file was actually missing.
      this._options_files[name as string] = null;
    }

    // If we have an override, return the overriden path
    if (name in this._filePathOverrides) {
      return this._filePathOverrides[name as string];
    }

    // Otherwise return the intended path location
    return path.join(this.getDirectory("dist.config"), name.toString());
  }

  /**
   * Returns the configuration object for definiting
   * @param name
   */
  getConfigFileDefinition<K extends keyof Files>(name: K): ConfigFile {
    this._usedFiles.add(name as string);
    const ret = this._options_files[name as string];
    if (!ret) {
      throw new TypeError(`Configuration file '${name}' was not defined`);
    }
    return ret;
  }

  /**
   * Returns the rendered contents of the specified config file
   * @param name
   */
  getConfigFileContents<K extends keyof Files>(name: K): Promise<Buffer> {
    this._usedFiles.add(name as string);
    const fileDef = this.getConfigFileDefinition(name);
    return getFileContents(this, fileDef, name as string, this._options.action);
  }

  /**
   * Returns all the file names used currently in the context
   * @returns an array of file names
   */
  getUsedConfigFiles(): string[] {
    return Array.from(this._usedFiles);
  }

  /**
   * Include a configuratino file in the definition
   * @param name
   * @param contents
   */
  setConfigFile<K extends keyof Files>(name: K, contents: ConfigFile): void {
    this._options_files[name as string] = contents;
  }

  /**
   * Change the location of the given configuration file
   * @param name the name of the file
   * @param newPath the new path
   */
  setConfigFilePath<K extends keyof Files>(name: K, newPath: string): void {
    this._filePathOverrides[name as string] = newPath;
  }

  /**
   * Resolve the absolute path of the given
   * @param name the name of the file to search
   * @param searchIn optional directory to search in (defaults to cwd)
   */
  resolveFilePath(name: string, searchIn?: string): string {
    return config.resolveFilePath(name, searchIn);
  }

  /**
   * Resolve the absolute path of the given package
   * @param name the name of the package to search
   * @param searchIn optional directory to search in (defaults to cwd)
   */
  resolvePackagePath(name: string, searchIn?: string) {
    return config.resolvePackagePath(name, searchIn || this.getDirectory("project"));
  }

  /**
   * Resolve a package from the project's node_modules
   * @param name the name of the package to search
   */
  resolveProjectPackage(name: string): string {
    return __non_webpack_require__.resolve(name, {
      paths: [path.join(this.getDirectory("project"), "node_modules")],
    });
  }

  getPackageConfigPath() {
    return path.join(this.getDirectory("project"), "package.json");
  }

  /**
   * Execute a system command and return the execution result
   */
  exec(
    binary: string,
    args?: string[],
    options?: execa.Options
  ): execa.ExecaChildProcess {
    logger.debug(`Invoking ${binary} ${(args || []).join(" ")}`);
    return execa(
      binary,
      args,
      merge(
        <execa.Options>{
          localDir: this.getDirectory("project"),
          preferLocal: true,
          stdio: "inherit",
          env: this._env,
        },
        options || {}
      )
    );
  }
}
