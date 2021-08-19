import type { RuntimeContext } from "../struct/RuntimeContext";
import type { ConfigFiles } from "./ConfigFile";
import type { PresetConfig } from "./PresetConfig";
import type { PresetOption } from "./PresetOption";
import type { PresetRuntimeConfig } from "./RuntimeConfig";

type PresetOptionsFromConfig<C> = C extends { options: infer Opt }
  ? Opt extends PresetOption
    ? Opt
    : {}
  : {};

type PresetFilesFromConfig<C> = C extends { files: infer Files }
  ? Files extends ConfigFiles<any, any>
    ? Files
    : {}
  : {};

/**
 * Extracts a runtime context for the given preset config
 */
export type PresetRuntimeContext<C> = C extends PresetConfig<
  infer Opt,
  infer Files
>
  ? RuntimeContext<PresetRuntimeConfig<Opt>, {}, Files>
  : never;
