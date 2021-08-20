import type { Action } from "./Action";
import type { ActionArguments } from "./ActionArgument";
import type { ConfigFiles } from "./ConfigFile";
import type { PresetConfig } from "./PresetConfig";
import type { PresetRuntimeConfig } from "./RuntimeConfig";
import type { PresetOptions } from "./PresetOption";

export type PresetActions<
  Opt extends PresetOptions = PresetOptions,
  Args extends ActionArguments = ActionArguments,
  Files extends ConfigFiles<PresetRuntimeConfig<Opt>, Args> = ConfigFiles<
    PresetRuntimeConfig<Opt>,
    Args
  >
> = Record<string, Action<Opt, Args, Files>>;

/**
 * Preset definition
 */
export interface Preset<
  Opt extends PresetOptions = PresetOptions,
  Files extends ConfigFiles<PresetRuntimeConfig<Opt>> = ConfigFiles<
    PresetRuntimeConfig<Opt>
  >,
  Actions extends PresetActions<Opt> = PresetActions<Opt>
> {
  /**
   * The minimum required engine version
   */
  engineVersion: string;

  /**
   * The preset configuration settings
   */
  config: PresetConfig<Opt, Files>;

  /**
   * The definition of actions exposed by this preset
   */
  actions?: Actions;
}
