import type { Action } from "./Action";
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

export interface PresetActions {
  [K: string]: Action;
}

/**
 * Preset definition
 */
export interface Preset<
  Actions extends PresetActions = PresetActions,
  Options extends PresetOptions = PresetOptions
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
