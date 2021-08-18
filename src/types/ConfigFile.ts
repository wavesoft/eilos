import type { RuntimeContext } from "../struct/RuntimeContext";
import type { RuntimeConfig } from "./RuntimeConfig";

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
  Args extends Object = {}
> = (
  ctx: RuntimeContext<Config, Args>,
  chainContents?: ConfigFileContents
) => ConfigFileContents;

/**
 * Configuration file constructor
 *
 * This can either be a pure buffer or a content generator
 */
export type ConfigFile<
  Config extends RuntimeConfig = RuntimeConfig,
  Args extends Object = {}
> = ConfigFileContents | ConfigFileGenerator<Config, Args>;
