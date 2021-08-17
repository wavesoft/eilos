import type { RuntimeContext } from "../struct/RuntimeContext";

/**
 * The configuration file contents can either be:
 *
 * - An object, in which case they will be serialized as JSON
 * - A plain string, in which case the contents are saved as-is
 * - A buffer, in which case the context are saved as-is
 */
export type ConfigFileContents = Object | string | Buffer;

/**
 * Configuration file constructor
 *
 * This can either be a pure buffer or a content generator
 */
export type ConfigFile =
  | ConfigFileContents
  | ((ctx: RuntimeContext) => ConfigFileContents);
