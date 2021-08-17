import type { Action, ActionArguments } from "./Action";
import type { Preset, PresetActions, PresetOptions } from "./Preset";

/**
 * Helper that can be used to define a strongly typed option definition
 * @param opt the options to compose
 * @returns the resulting options array
 */
export function DefinePresetOptions<O extends PresetOptions>(opt: O): O {
  return opt;
}

/**
 * Helper function to define a preset
 * @param preset the preset configuration
 * @returns a preset instance
 */
export function DefinePreset<
  Actions extends PresetActions,
  Options extends PresetOptions
>(preset: { actions?: Actions; options?: Options }): Preset<Actions, Options> {
  return {
    engineVersion: "",
    actions: preset.actions,
    options: preset.options,
  };
}

/**
 * Helper function to define function arguments
 * @param args the function arguments to pass through
 */
export function DefineActionArgs<Args extends ActionArguments>(
  args: Args
): Args {
  return args;
}

/**
 * Helper function to define a preset
 * @param preset the preset configuration
 * @returns a preset instance
 */
export function DefineAction<
  Options extends PresetOptions,
  Args extends ActionArguments
>(preset: Action<Args, Options> & { options: Options }): Action<Args, Options> {
  return {
    ...preset,
  };
}
