import type {
  Action,
  ActionArgument,
  ActionArguments,
  ActionHandler,
  ArgumentsType,
  SomeActionArguments,
} from "./Action";
import type {
  Preset,
  PresetActions,
  PresetOption,
  PresetOptions,
} from "./Preset";
import type { ConfigFile } from "./ConfigFile";
import type { PresetRuntimeConfig } from "./RuntimeConfig";

import packageConfig from "../../package.json";

import loggerBase from "../logger";
const logger = loggerBase.child({ component: "helpers" });

/**
 * Helper that can be used to define a strongly typed option definition
 * @param opt the options to compose
 * @returns the resulting options array
 */
export function DefinePresetOptions<O extends PresetOptions>(opt: O): O {
  return opt;
}

/**
 * Converts a union of types into an intersection of types
 */
type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never;

type Merge<A extends any[]> = UnionToIntersection<A[number]>;

/**
 * Merge two configuration files using a combinatoric expansion of various
 * different combinations
 * @param a
 * @param b
 */
function mergeFiles<
  Opts extends PresetOptions = PresetOptions,
  Args extends ActionArguments = ActionArguments
>(
  a: ConfigFile<PresetRuntimeConfig<Opts>, ArgumentsType<Args>>,
  b: ConfigFile<PresetRuntimeConfig<Opts>, ArgumentsType<Args>>,
  indexKey: string
): ConfigFile<PresetRuntimeConfig<Opts>, ArgumentsType<Args>> {
  if (typeof a === "function") {
    // 'a' is a generator

    if (typeof b === "function") {
      // 'b' is a generator
      return (ctx, chain) => {
        const aV = a(ctx, chain);
        const bV = b(ctx, aV);
        return bV;
      };
    } else if (typeof b === "object") {
      // 'b' is a JSON object
      return (ctx, chain) => {
        const aV = a(ctx, chain);
        return ctx.util.merge(aV, b);
      };
    } else {
      // 'b' is a blob of text
      return (ctx, chain) => {
        logger.warn(
          `Could not combine contents of file ${indexKey}: keeping the last text contents`
        );
        return b;
      };
    }
  } else if (typeof a === "object") {
    // 'a' is a JSON object
    if (typeof b === "function") {
      // 'b' is a generator
      return (ctx, chain) => {
        const aV = ctx.util.merge(chain || {}, a);
        const bV = b(ctx, aV);
        return bV;
      };
    } else if (typeof b === "object") {
      // 'b' is a JSON object
      return (ctx, chain) => {
        return ctx.util.merge(chain || {}, a, b);
      };
    } else {
      // 'b' is a blob of text
      return (ctx, chain) => {
        logger.warn(
          `Could not combine contents of file ${indexKey}: keeping the last text contents`
        );
        return b;
      };
    }
  } else {
    // 'a' is a blob of text
    if (typeof b === "function") {
      // 'b' is a generator
      return (ctx, chain) => {
        return b(ctx, a);
      };
    } else if (typeof b === "object") {
      // 'b' is a JSON object
      return (ctx, chain) => {
        logger.warn(
          `Could not combine contents of file ${indexKey}: JSON object cannot be combined with text, keeping the last text contents`
        );
        return b;
      };
    } else {
      // 'b' is a blob of text
      return (ctx, chain) => {
        logger.warn(
          `Could not combine contents of file ${indexKey}: keeping the last text contents`
        );
        return b;
      };
    }
  }
}

/**
 * Merge the two actions by creating proxy chain methods to satisfy
 * the chaining requirements for combining their presets.
 *
 * @param a the base action
 * @param b the action to extend the base with
 */
function mergeActions<
  Opts extends PresetOptions = PresetOptions,
  Args extends ActionArguments = ActionArguments
>(
  a: Action<Opts, Args>,
  b: Action<Opts, Args>,
  actionName: string
): Action<Opts, Args> {
  const ret: Action<Opts, Args> = {
    files: {},
  };
  const chainFnNames = ["preRun", "run", "postRun"] as const;

  // Combine chainable functions
  for (const fn of chainFnNames) {
    const aFn = a[fn] as ActionHandler<Opts, Args> | undefined;
    const bFn = b[fn] as ActionHandler<Opts, Args> | undefined;

    if (aFn && bFn) {
      // When both actions are present, chain them, running first the
      // action on 'a' and then the action on 'b'
      ret[fn] = async (ctx) => {
        await aFn(ctx);
        await bFn(ctx);
      };
    } else if (aFn) {
      ret[fn] = bFn;
    } else if (bFn) {
      ret[fn] = bFn;
    }
  }

  // Combine configuraion file generation
  const aFiles = a.files ? Object.keys(a.files) : [];
  const bFiles = b.files ? Object.keys(b.files) : [];
  const allFiles = aFiles.concat(bFiles);

  for (const file of allFiles) {
    const aFile = a.files ? a.files[file] : undefined;
    const bFile = b.files ? b.files[file] : undefined;

    if (aFile && bFile) {
      // When both file configuration are present, we are using the
      // value from 'aFile' as base, and we are merging the results
      // from the 'bFile' on top. However there are a few combinatoric
      // operations we have to handle separately
      ret.files![file] = mergeFiles<Opts, Args>(
        aFile,
        bFile,
        `${actionName}:${file}`
      );
    } else if (aFile) {
      ret.files![file] = aFile;
    } else if (bFile) {
      ret.files![file] = bFile;
    }
  }

  return ret;
}

/**
 * Helper function to define a preset
 *
 * Multiple definitions can be given if you want to create a composite definition
 * that merges multiple presets into one.
 *
 * @param preset the preset configuration
 * @returns a preset instance
 */
export function DefinePreset<
  Options extends PresetOptions,
  Actions extends PresetActions<Options, any>[]
>(
  ...presets: Array<Partial<Preset<Options, Actions[number]>>>
): Preset<Options, Actions[number]> {
  const retVal: Preset<Options, Actions[number]> = {
    engineVersion: packageConfig.version,
    actions: {} as any,
    options: {} as any,
  };

  for (const preset of presets) {
    // Combine all the actions collected
    if (preset.actions) {
      for (const actionName in preset.actions) {
        const action = preset.actions[actionName];
        if (actionName in retVal.actions!) {
          const prevAction = (retVal.actions as any)[actionName];
          (retVal.actions as any)[actionName] = mergeActions<
            Options,
            Actions[number]
          >(prevAction, action, actionName);
        } else {
          (retVal.actions as any)[actionName] = action;
        }
      }
    }
    // Combine all the options collected
    if (preset.options) {
      retVal.options = {
        ...retVal.options,
        ...preset.options,
      };
    }
  }

  return retVal;
}

/**
 * Helper function to define function arguments
 * @param args the function arguments to pass through
 */
export function DefineActionArgs<Args extends ActionArguments>(
  args: Args
): Args {
  return args;
}

/**
 * Helper function to define a preset
 * @param preset the preset configuration
 * @returns a preset instance
 */
export function DefineAction<
  Options extends PresetOptions,
  Args extends ActionArguments
>(options: Options, preset: Action<Options, Args>): Action<Options, Args> {
  return {
    ...preset,
  };
}
