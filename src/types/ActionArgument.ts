/**
 * Describes a CLI argument for the action
 */
export interface ActionArgument {
  type?: "string" | "number" | "boolean";

  /**
   * Indicates that this argument should be collected out of the
   * positional arguments and not as a '--name' named argument.
   *
   * The idnex of the argument is computed by the order of this
   * argument in the array of all arguments.
   */
  positional?: boolean;

  /**
   * Another alias for this argument
   *
   * For example if name is 'debug', short can be 'D'
   */
  short?: string;

  /**
   * The default value to use when the argument is missing
   */
  defaultValue?: any;

  /**
   * A description to show to the user for the help message
   */
  description?: string;

  /**
   * Indicates that the argument is required
   */
  required?: boolean;
}

/**
 * Matches a dictionary of arguments
 */
export type ActionArguments = Record<string, ActionArgument>;

/**
 * Matches a dictionary of the values of arguments
 */
export type ActionArgumentValues = Record<string, any>;

/**
 * Loosely matches a dictionary of arguments
 */
export type SomeActionArguments = Record<string, ActionArgument>;

/**
 * Computes the data type of the given argument
 */
export type ArgumentValueType<A extends ActionArgument> = A extends {
  type: "string";
}
  ? string
  : A extends { type: "number" }
  ? number
  : A extends { type: "boolean" }
  ? boolean
  : never;

/**
 * Computes the data type of the given argument
 */
export type ArgumentType<A extends ActionArgument> = A extends {
  required: true;
}
  ? ArgumentValueType<A>
  : ArgumentValueType<A> | undefined;

/**
 * Computes a dictionary with all the options with the respective types
 */
export type ArgumentsType<A extends ActionArguments> = {
  [K in keyof A]: A[K] extends { required: true }
    ? ArgumentType<A[K]>
    : A[K] extends { defaultValue: any }
    ? ArgumentType<A[K]>
    : ArgumentType<A[K]> | undefined;
};
