import type { ActionArguments, ArgumentsType } from "./ActionArgument";
import type { ConfigFile, ConfigFiles } from "./ConfigFile";
import type { PresetOptions } from "./PresetOption";
import type { PresetRuntimeConfig } from "./RuntimeConfig";
import type { RuntimeContext } from "../struct/RuntimeContext";

/**
 * Function signature for all the .runXXX() methods
 */
export type ActionHandler<
  Opt extends PresetOptions = PresetOptions,
  Args extends ActionArguments = ActionArguments,
  Files extends ConfigFiles<PresetRuntimeConfig<Opt>, Args> = ConfigFiles<
    PresetRuntimeConfig<Opt>,
    Args
  >
> = (
  ctx: RuntimeContext<PresetRuntimeConfig<Opt>, Args, Files>
) => Promise<any>;

/**
 * The preset action definition interface
 */
export interface Action<
  Opt extends PresetOptions = PresetOptions,
  Args extends ActionArguments = ActionArguments,
  BaseFiles extends ConfigFiles<PresetRuntimeConfig<Opt>, Args> = {},
  ActionFiles extends Record<
    string,
    ConfigFile<PresetRuntimeConfig<Opt>, Args, BaseFiles>
  > = {}
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
   *    filename: {
   *      positional: true,
   *      type: "string",
   *      description: "The file name to build"
   *    },
   *    verbose: {
   *      type: "boolean",
   *      description: "Show details about what's happening"
   *    }
   *  }
   * ```
   */
  arguments?: Args;

  /**
   * One or more files to use from the global context
   */
  useFiles?: Array<keyof BaseFiles>;

  /**
   * One or more files associated with this action
   *
   * Just like the files reated in the global scope, you can define
   * either the contents or a generator function that will produce the
   * contents.
   *
   * In contrast to global files that needs to be explicitly
   * imported using the `useFiles` statement, *ANY* file defined
   * in the `files` section is implicitly used when the action
   * is used.
   */
  files?: ActionFiles;

  /**
   * Action handler before the action is executed
   */
  preRun?: ActionHandler<Opt, Args, BaseFiles>;

  /**
   * Action handler
   */
  run?: ActionHandler<Opt, Args, BaseFiles>;

  /**
   * Action handler before the action is executed
   */
  postRun?: ActionHandler<Opt, Args, BaseFiles>;
}
