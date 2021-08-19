import { RuntimeContext } from "../struct/RuntimeContext";
import { RuntimeConfig } from "./RuntimeConfig";

/**
 * The configuration file contents can either be:
 *
 * - An object, in which case they will be serialized as JSON
 * - A plain string, in which case the contents are saved as-is
 * - A buffer, in which case the context are saved as-is
 */
export type ConfigFileContents = Object | string | Buffer;

/**
 * Configuration file generator
 */
export type ConfigFileGenerator<
  Config extends RuntimeConfig = RuntimeConfig,
  Args extends Object = {},
  Files extends ConfigFiles<Config, Args> = ConfigFiles<Config, Args>
> = (
  ctx: RuntimeContext<Config, Args, Files>,
  chainContents?: ConfigFileContents
) => ConfigFileContents;

export type ConfigFileMergeStrategy = "concat" | "replace";

/**
 * Known configuration file MIME types, that are quite useful when
 * the engine needs to merge the contents from different sources
 */
export type ConfigFileMimeType =
  | "text/plain"
  | "application/json"
  | "application/javascript"
  | "application/octet-stream";

/**
 * Common attributes of all files
 */
export interface ConfigFileBase {
  /**
   * Knonwn MIME type for this file
   */
  mimeType?: ConfigFileMimeType;

  /**
   * Strategy when merging contents
   */
  combine?: ConfigFileMergeStrategy;
}

/**
 * A configuration file with known contents
 */
export interface StaticConfigFile extends ConfigFileBase {
  contents: ConfigFileContents;
}

/**
 * A configuration file with dynamic contents, computed
 * as a result of a generator function
 */
export interface GeneratedConfigFile<
  Config extends RuntimeConfig = RuntimeConfig,
  Args extends Object = {},
  Files extends ConfigFiles<Config, Args> = ConfigFiles<Config, Args>
> extends ConfigFileBase {
  /**
   * The function to use for generating the file contents
   */
  generator: ConfigFileGenerator<Config, Args, Files>;
}

/**
 * Definition of a preset-generated configuration file
 */
export type ConfigFile<
  Config extends RuntimeConfig = RuntimeConfig,
  Args extends Object = {},
  KnownFiles extends ConfigFiles<Config, Args> = {}
> = StaticConfigFile | GeneratedConfigFile<Config, Args, KnownFiles>;

// /**
//  * Definition of a preset-generated configuration file
//  */
// export type ActionConfigFile<
//   Config extends RuntimeConfig = RuntimeConfig,
//   Args extends Object = {}
// > = ConfigFile<Config, Args> | { emit: true };

/**
 * A shape for multiple preset files
 */
export type ConfigFiles<
  Config extends RuntimeConfig = RuntimeConfig,
  Args extends Object = {},
  KnownFiles extends ConfigFiles<Config, Args> = {}
> = Record<string, ConfigFile<Config, Args, KnownFiles>>;

/**
 * Combines the file definitions of two sources
 */
export type CombinedFiles<
  Config extends RuntimeConfig,
  Args extends Object,
  FilesA extends ConfigFiles<Config, Args>,
  FilesB extends ConfigFiles<Config, Args>
> = FilesA & FilesB;
