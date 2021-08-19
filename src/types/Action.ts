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
