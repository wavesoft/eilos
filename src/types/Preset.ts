import type { Action, ActionArguments } from "./Action";
import type { SomeJTDSchemaType } from "ajv/dist/types/jtd-schema";

/**
 * Configuration parameters for a preset option
 */
export interface PresetOption {
  /**
   * The value to use when the user hasn't provided a value
   */
  defaultValue?: any;

  /**
   * Set to a message to display when the user tries to use this value
   */
  deprecated?: string;

  /**
   * The user-friendly description for the value
   */
  description?: string;

  /**
   * Require this value to be given
   */
  required?: boolean;

  /**
   * An optional JTD schema to use for validating the user value
   *
   * If you want to validate different types for the same value (eg. union)
   * you can use an array of different scehmas.
   */
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
