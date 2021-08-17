import type { ConfigFile } from "./ConfigFile";
import type { RuntimeContext } from "../struct/RuntimeContext";

export interface ActionPositionalArgument {
  name: string;
  required?: boolean;
}

export interface ActionFlagArgument {
  name: string;
  short?: string;
}

export interface ActionNamedArgument {
  name: string;
  short?: string;
  required?: boolean;
}

export type ActionArgument =
  | ActionPositionalArgument
  | ActionFlagArgument
  | ActionNamedArgument;

/**
 * An action definition interface
 */
export interface Action {
  /**
   * The name of the action to invoke
   */
  name: string;

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
  arguments?: {
    // One or more positional arguments
    positional?: ActionPositionalArgument[];
    // One or more flag arguments
    flag?: ActionFlagArgument[];
    // One or more named arguments
    named?: ActionNamedArgument[];
  };

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
  files?: Record<string, ConfigFile>;

  /**
   * Action handler before the action is executed
   */
  preRun?: (ctx: RuntimeContext) => Promise<any>;

  /**
   * Action handler
   */
  run: (ctx: RuntimeContext) => Promise<any>;

  /**
   * Action handler before the action is executed
   */
  postRun?: (ctx: RuntimeContext) => Promise<any>;
}
