import type { ConfigFiles } from "./ConfigFile";
import type { PresetOptions } from "./PresetOption";
import type { PresetRuntimeConfig } from "./RuntimeConfig";

/**
 * Configuration package for a preset, including user-tunable options and files
 */
export interface PresetConfig<
  Opt extends PresetOptions = PresetOptions,
  Files extends ConfigFiles<PresetRuntimeConfig<Opt>> = ConfigFiles<
    PresetRuntimeConfig<Opt>
  >
> {
  /**
   * One or more configuration options for the preset
   */
  options?: Opt;

  /**
   * One or more files for the preset
   */
  files?: Files;
}
