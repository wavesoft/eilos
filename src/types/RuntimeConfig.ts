import type { JTDDataType } from "ajv/dist/types/jtd-schema";
import type { SomeJTDSchemaType } from "ajv/dist/types/jtd-schema";
import type { PresetOptions } from "./PresetOption";

/**
 * Holds the definition of the run-time configuration parameters
 */
export interface RuntimeConfig {
  /**
   * Indicates that the system is running in debug mode
   */
  debug: boolean;

  /**
   * The logging level
   */
  logLevel: string;

  /**
   * The name of the current action
   */
  action: string;

  /**
   * Extra arguments from the command-line
   */
  argv: string[];
}

export type SomeRuntimeConfig = {
  [K in keyof any]: any;
};

export type EnumJDTSchemaType<T> = {
  enum: T[];
};

/**
 * For some reason the JTDDataType cannot expand `enum` arrays.
 * This type is patching that bug.
 */
export type ExtendedJDTDataType<T> = T extends EnumJDTSchemaType<infer S>
  ? S
  : JTDDataType<T>;

export type OptionDataType<
  T extends SomeJTDSchemaType | ReadonlyArray<SomeJTDSchemaType>
> = T extends ReadonlyArray<infer A>
  ? ExtendedJDTDataType<A>
  : ExtendedJDTDataType<T>;

/**
 * Extracts a runtime config for the given preset options config
 */
export type PresetRuntimeConfig<T extends PresetOptions> = {
  [K in keyof T]: T[K] extends { schema: infer S } ? OptionDataType<S> : any;
} & RuntimeConfig;
