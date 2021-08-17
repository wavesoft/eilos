import type { Action } from "./Action";
import type { SomeJSONSchema } from "ajv/dist/types/json-schema";
import type { RuntimeContext } from "../struct/RuntimeContext";

/**
 * Configuration parameters for a preset option
 */
export interface PresetOption {
  description?: string;
  defaultValue?: any;
  schema?: SomeJSONSchema;
}

/**
 * Preset definition
 */
export interface Preset {
  /**
   * The minimum required engine version
   */
  engineVersion: string;

  /**
   * The definition of actions exposed by this preset
   */
  actions?: Action[];

  /**
   * The tunable options required by this preset
   *
   * These options will be read from the user's eilos configuration
   * source and are handled internally by the actions.
   */
  options?: Record<string, PresetOption>;
}

/**
 * A factory that creates a dynamic configuration based on the given context
 */
export type PresetFactory = (ctx: RuntimeContext) => Preset;
