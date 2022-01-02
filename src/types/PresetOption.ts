import type { SomeJTDSchemaType } from "ajv/dist/types/jtd-schema";

type SomeJTDSchemaTypeWithEnum =
  | SomeJTDSchemaType
  | {
      enum: ReadonlyArray<string>;
    };

/**
 * Definition of a user-configurable option
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
  schema?: SomeJTDSchemaTypeWithEnum | ReadonlyArray<SomeJTDSchemaTypeWithEnum>;
}

/**
 * Interface for matching a dictionary of options
 */
export interface PresetOptions {
  [K: string]: PresetOption;
}
