import type { ConfigFile } from "./ConfigFile";
import type { RuntimeContext } from "../struct/RuntimeContext";
import type { PresetOptions } from "./Preset";
import type { PresetRuntimeConfig } from "./RuntimeConfig";

export interface ActionArgument {
  type?: "string" | "number" | "boolean";

  positional?: boolean;
  defaultValue?: any;
  description?: string;
  required?: boolean;
  short?: string;
}

export interface ActionArguments {
  [K: string]: ActionArgument;
}

export type SomeActionArguments = Record<string, ActionArgument>;

type ArgumentType<A extends ActionArgument> = A extends {
  type: "string";
}
  ? string
  : A extends { type: "number" }
  ? number
  : A extends { type: "boolean" }
  ? boolean
  : never;

export type ArgumentsType<A extends ActionArguments> = {
  [K in keyof A]: A[K] extends { required: true }
    ? ArgumentType<A[K]>
    : ArgumentType<A[K]> | undefined;
};

/**
 * Function signature for all the .runXXX methods
 */
export type ActionHandler<
  Opts extends PresetOptions = PresetOptions,
  Args extends ActionArguments = ActionArguments
> = (
  ctx: RuntimeContext<PresetRuntimeConfig<Opts>, ArgumentsType<Args>>
) => Promise<any>;

/**
 * An action definition interface
 */
export interface Action<
  Opts extends PresetOptions = PresetOptions,
  Args extends ActionArguments = ActionArguments
> {
  /**
   * An optional description for this action
   */
  description?: string;

  /**
   * Optional argument configuration
   *
   * For example:
   * ```
   *  arguments: {
   *    positional: [
   *      { name: "filename" },
   *      ...
   *    ],
   *    flag: [
   *      { name: "debug", short: "D" },
   *      ...
   *    ],
   *    named: [
   *      { name: "input", required: true },
   *      ...
   *    ]
   *  }
   * ```
   */
  arguments?: Args;

  /**
   * One or more files associated with this action
   *
   * The configuration file name will also be the name of the file
   * that will be saved on disk.
   *
   * The file is normally saved with it's contents, with the exception
   * of when the file extension is '.js' and an object is returned.
   *
   * In this case, a proxy `.js` file is generated that will forward the
   * request to the file contents generator at run-time
   */
  files?: Record<
    string,
    ConfigFile<PresetRuntimeConfig<Opts>, ArgumentsType<Args>>
  >;

  /**
   * Action handler before the action is executed
   */
  preRun?: ActionHandler<Opts, Args>;

  /**
   * Action handler
   */
  run?: ActionHandler<Opts, Args>;

  /**
   * Action handler before the action is executed
   */
  postRun?: ActionHandler<Opts, Args>;
}
