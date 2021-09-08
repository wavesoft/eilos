import type { Action } from "./Action";
import type { ActionArguments } from "./ActionArgument";
import type { ConfigFile, ConfigFileBase, ConfigFiles } from "./ConfigFile";
import type { Preset, PresetActions } from "./Preset";
import type { PresetConfig } from "./PresetConfig";
import type { PresetOptions } from "./PresetOption";
import type { PresetRuntimeConfig } from "./RuntimeConfig";

import packageConfig from "../../package.json";
import { mergeActions, mergeFiles } from "../utils/DefinitionUtil";

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Options Factory
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Helepr function to define a list of preset options that can be used in various other places
 * @param opt the option definition
 */
export function DefinePresetOptions<Opt extends PresetOptions>(opt: Opt): Opt {
  return opt;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// File Factory
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Helepr function to define a list of preset options that can be used in various other places
 * @param opt the option definition
 */
export function DefinePresetFile<Opt extends PresetOptions>(
  options: Opt,
  cfg: ConfigFile<PresetRuntimeConfig<Opt>, {}, Record<string, ConfigFile>>
): ConfigFile<PresetRuntimeConfig<Opt>, {}, {}> {
  return cfg;
}

/**
 * Helepr function to define an output file
 * @param opt the option definition
 */
export function DefinePresetOutputFile<Opt extends PresetOptions>(
  options: Opt,
  cfg: ConfigFileBase
): ConfigFile<PresetRuntimeConfig<Opt>, {}, {}> {
  return {
    ...cfg,
    output: true,
  };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Argument Argument Factory
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Helper function to define function arguments
 * @param args the function arguments to pass through
 */
export function DefineActionArgs<Args extends ActionArguments>(
  args: Args
): Args {
  return args;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Argument Factory
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Helper function to define a preset
 * @param action the preset configuration
 * @returns a preset instance
 */
export function DefineAction<
  Opt extends PresetOptions,
  BaseFiles extends ConfigFiles<PresetRuntimeConfig<Opt>>,
  Args extends ActionArguments,
  ActionFiles extends ConfigFiles<PresetRuntimeConfig<Opt>, Args, BaseFiles>
>(
  config: PresetConfig<Opt, BaseFiles>,
  action: Action<Opt, Args, BaseFiles, ActionFiles>
): Action<Opt, Args, BaseFiles, ActionFiles> {
  return {
    ...action,
  };
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Preset Configuration Factory
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Create a new preset configuration
 * @param cfg the preset configuration
 */
export function DefinePresetConfig<
  Opt extends PresetOptions,
  Files extends ConfigFiles<PresetRuntimeConfig<Opt>>
>(cfg: PresetConfig<Opt, Files>): PresetConfig<Opt, Files>;

/**
 * Create a new preset configuration by extending an existing
 * preset configuration with additional properties
 *
 * @param extendCfg the base configuration to extend
 * @param cfg the new configuration
 */
export function DefinePresetConfig<
  Opt1 extends PresetOptions,
  Opt2 extends PresetOptions,
  Files1 extends ConfigFiles<PresetRuntimeConfig<Opt1>>,
  Files2 extends ConfigFiles<PresetRuntimeConfig<Opt2>>
>(
  extendCfg: PresetConfig<Opt1, Files1>,
  cfg: PresetConfig<Opt2, Files2>
): PresetConfig<Opt1 & Opt2, Files1 & Files2>;

// Multi-faceted implementation
export function DefinePresetConfig<
  Opt1 extends PresetOptions,
  Files1 extends ConfigFiles<PresetRuntimeConfig<Opt1>>,
  Opt2 extends PresetOptions = {},
  Files2 extends ConfigFiles<PresetRuntimeConfig<Opt2>> = {}
>(
  cfgOrBase: PresetConfig<Opt1, Files1>,
  cfg?: PresetConfig<Opt2, Files2>
): PresetConfig<Opt1 & Opt2, Files1 & Files2> {
  // If we are not extending anything, just return the base config
  if (cfg == null) {
    return cfgOrBase as PresetConfig<Opt1 & Opt2, Files1 & Files2>;
  }

  // If we are extending another config, merge the parameters
  const dst: PresetConfig<Opt1 & Opt2, Files1 & Files2> = {
    files: {},
    options: {},
  } as any;
  Object.assign(dst, cfgOrBase);

  // Merge file configuration
  if (cfg.files) {
    for (const fileName in cfg.files) {
      // TODO
    }
  }

  // Merge option configuration
  if (cfg.options) {
    // TODO
  }

  return dst;
}

////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Preset Factory
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Helper function to define a preset
 *
 * Multiple definitions can be given if you want to create a composite definition
 * that merges multiple presets into one.
 *
 * @param preset the preset configuration
 * @returns a preset instance
 */
export function DefinePreset<
  Opts extends PresetOptions,
  Files extends ConfigFiles<PresetRuntimeConfig<Opts>>,
  Actions extends PresetActions<Opts, any>
>(preset: Preset<Opts, Files, Actions>): Preset<Opts, Files, Actions>;
export function DefinePreset<
  Opts1 extends PresetOptions,
  Opts2 extends PresetOptions,
  Files1 extends ConfigFiles<PresetRuntimeConfig<Opts1>>,
  Files2 extends ConfigFiles<PresetRuntimeConfig<Opts2>>,
  Actions1 extends PresetActions<Opts1, any>,
  Actions2 extends PresetActions<Opts2, any>
>(
  prevPreset: Preset<Opts1, Files1, Actions1>,
  preset: Preset<Opts2, Files2, Actions2>
): Preset<Opts1 & Opts2, Files1 & Files2, Actions1 & Actions2>;
export function DefinePreset<
  Opts1 extends PresetOptions,
  Opts2 extends PresetOptions,
  Files1 extends ConfigFiles<PresetRuntimeConfig<Opts1>>,
  Files2 extends ConfigFiles<PresetRuntimeConfig<Opts2>>,
  Actions1 extends PresetActions<Opts1, any>,
  Actions2 extends PresetActions<Opts2, any>
>(
  prevOrMain: Preset<Opts1, Files1, Actions1>,
  preset?: Preset<Opts2, Files2, Actions2>
): Preset<Opts1 & Opts2, Files1 & Files2, Actions1 & Actions2> {
  const retVal: Preset<Opts1 & Opts2, Files1 & Files2, Actions1 & Actions2> = {
    actions: {} as any,
    config: {} as any,
    engineVersion: packageConfig.version,
  };

  // Shallow copy base value
  Object.assign(retVal, prevOrMain);

  // Merge with preset if given
  if (preset) {
    // Combine all the actions collected
    if (preset.actions) {
      for (const actionName in preset.actions) {
        const action = preset.actions[actionName];
        if (actionName in retVal.actions!) {
          const prevAction = (retVal.actions as any)[actionName];
          (retVal.actions as any)[actionName] = mergeActions<
            Opts1 & Opts2,
            Files1 & Files2,
            Actions1 & Actions2
          >(prevAction, action, actionName);
        } else {
          (retVal.actions as any)[actionName] = action;
        }
      }
    }

    // Combine files if present
    if (preset.config.files) {
      if (!retVal.config.files) {
        // If files are missing just copy over
        retVal.config.files = {
          ...preset.config.files,
        } as any;
      } else {
        for (const fileName in preset.config.files) {
          const file = preset.config.files[fileName];
          const prevFile = retVal.config.files[fileName];
          retVal.config.files[fileName] = mergeFiles(
            fileName,
            prevFile,
            file
          ) as any;
        }
      }
    }

    // Combine options if present
    if (preset.config.options) {
      if (!retVal.config.options) {
        // If options are missing just copy over
        retVal.config.options = {
          ...preset.config.options,
        } as any;
      } else {
        // If both exists, keep the latest version
        for (const optName in preset.config.options) {
          retVal.config.options[optName] = preset.config.options[
            optName
          ] as any;
        }
      }
    }
  }

  return retVal;
}
