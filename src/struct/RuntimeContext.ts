import execa from "execa";
import merge from "deepmerge";
import path from "path";
import type { Logger } from "winston";

import * as config from "../config";
import loggerBase from "../logger";
import type { ConfigFile } from "../types/ConfigFile";
import type { RuntimeConfig } from "../types/RuntimeConfig";
import { ActionArguments } from "../types/Action";

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
 * Runtime context of eilos, passed around as arguments to build actions
 */
export class RuntimeContext<
  Config extends RuntimeConfig = RuntimeConfig,
  Args extends Object = {}
> {
  readonly util: RuntimeContextUtil;
  readonly logger: Logger;

  private _args: Args;
  private _env: Record<string, string>;
  private _dir: Record<string, string>;
  private _config: Config;
  private _config_files: Record<string, ConfigFile | null>;

  constructor(env: Record<string, string>, dir: Record<string, string>) {
    this.util = {
      merge: (...args: Object[]) =>
        merge.all(args, { arrayMerge: overwriteMerge }),
    };
    this._env = env;
    this._dir = dir;
    this._config = {} as Config;
    this._config_files = {};
    this._args = {} as Args;
    this.logger = logger;
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
  getArg<A extends keyof Args>(name: A, defaultValue?: Args[A]): any {
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
  updateConfig(obj: Partial<Config>): void {
    this._config = merge(this._config, obj, { arrayMerge: overwriteMerge });
  }

  /**
   * Return section from the run-time configuration
   */
  getConfig<K extends keyof Config>(name: K): Config[K] | undefined;
  getConfig<K extends keyof Config>(name: K, defaults: Config[K]): Config[K];
  getConfig<K extends keyof Config>(
    name: K,
    defaults?: Config[K]
  ): Config[K] | undefined {
    const value = this._config[name];
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
  getConfigFilePath(name: string): string {
    if (this._config_files[name] == null) {
      this._config_files[name] = null;
    }
    return path.join(this.getDirectory("dist.config"), name);
  }

  /**
   * Include a configuratino file in the definition
   * @param name
   * @param contents
   */
  addConfigFile(name: string, contents: ConfigFile): void {
    this._config_files[name] = contents;
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
    return config.resolvePackagePath(name, searchIn);
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
