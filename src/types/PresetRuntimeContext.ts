import type { RuntimeContext } from "../struct/RuntimeContext";
import type { ConfigFile } from "./ConfigFile";
import type { PresetConfig } from "./PresetConfig";
import type { PresetOptions } from "./PresetOption";
import type { PresetRuntimeConfig } from "./RuntimeConfig";

/**
 * Extracts a runtime context for the given preset config
 *
 * This context is aware of both global 'options' and global 'files'
 * and can be used when defining preset ations.
 */
export type PresetRuntimeContext<C> = C extends PresetConfig<
  infer Opt,
  infer Files
>
  ? RuntimeContext<PresetRuntimeConfig<Opt>, {}, Files>
  : never;

/**
 * Extracts a runtime context from the given preset options
 *
 * This context is aware only of global 'options' and 'files' are
 * assumed to be an arbitrary map of strings.
 */
export type PresetOptionsRuntimeContext<C extends PresetOptions> =
  RuntimeContext<PresetRuntimeConfig<C>, {}, { [K: string]: ConfigFile }>;
