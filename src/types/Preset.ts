import type { Action, ActionArguments } from "./Action";
import type { SomeJTDSchemaType } from "ajv/dist/types/jtd-schema";

/**
 * Configuration parameters for a preset option
 */
export interface PresetOption {
  description?: string;
  defaultValue?: any;
  schema?: SomeJTDSchemaType | ReadonlyArray<SomeJTDSchemaType>;
}

export interface PresetOptions {
  [K: string]: PresetOption;
}

export interface PresetActions<
  O extends PresetOptions = PresetOptions,
  Args extends ActionArguments = ActionArguments
> {
  [K: string]: Action<O, Args>;
}

/**
 * Preset definition
 */
export interface Preset<
  Options extends PresetOptions = PresetOptions,
  Actions extends PresetActions<Options> = PresetActions<Options>
> {
  /**
   * The minimum required engine version
   */
  engineVersion: string;

  /**
   * The definition of actions exposed by this preset
   */
  actions?: Actions;

  /**
   * The tunable options required by this preset
   *
   * These options will be read from the user's eilos configuration
   * source and are handled internally by the actions.
   */
  options?: Options;
}
