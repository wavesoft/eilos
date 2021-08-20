import merge from "deepmerge";

import type { Action, ActionHandler } from "../types/Action";
import type { ActionArguments, ArgumentsType } from "../types/ActionArgument";
import type {
  ConfigFile,
  ConfigFileContents,
  ConfigFileMergeStrategy,
  ConfigFileMimeType,
  ConfigFiles,
} from "../types/ConfigFile";
import type { PresetOptions } from "../types/PresetOption";
import type { PresetRuntimeConfig } from "../types/RuntimeConfig";

/**
 * Merge strategy for arrays
 */
const overwriteMerge = (
  destinationArray: any[],
  sourceArray: any[],
  options: any
) => ([] as any[]).concat(destinationArray, sourceArray);

/**
 * Deep merge objects
 * @param args an array of objects to merge
 * @returns the resulting object
 */
export function mergeObjects(...args: any[]): any {
  return merge.all(args, { arrayMerge: overwriteMerge });
}

/**
 * Find out the resulting mime of the given cmobination
 * @param strategy the merge strategy
 * @param aMime the first mime
 * @param bMime the second mime
 * @returns
 */
export function mergeMime(
  strategy: ConfigFileMergeStrategy,
  aMime: ConfigFileMimeType = "text/plain",
  bMime: ConfigFileMimeType = "text/plain"
): ConfigFileMimeType {
  if (strategy === "replace") return bMime;
  if (aMime === bMime) return aMime;
  return "application/octet-stream";
}

/**
 * Merge the contents of two files
 * @param indexKey the index
 * @param strategy the merge strategy
 * @param a the first file
 * @param b the second file
 * @returns the merged file contents
 */
export function mergeContents(
  indexKey: string,
  strategy: ConfigFileMergeStrategy,
  a: ConfigFileContents | undefined,
  b: ConfigFileContents
): ConfigFileContents {
  if (strategy === "replace" || a == null) {
    return b;
  }

  if (a instanceof Buffer) {
    if (b instanceof Buffer) {
      return Buffer.concat([a, b]);
    } else if (typeof b === "object") {
      throw new TypeError(
        `Could not combine the contents of '${indexKey}': cannot merge buffer with object`
      );
    } else {
      return Buffer.concat([a, Buffer.from(b, "utf-8")]);
    }
  } else if (typeof a === "object") {
    if (b instanceof Buffer) {
      throw new TypeError(
        `Could not combine the contents of '${indexKey}': cannot merge object with buffer`
      );
    } else if (typeof b === "object") {
      return mergeObjects(a, b);
    } else {
      throw new TypeError(
        `Could not combine the contents of '${indexKey}': cannot merge buffer with object`
      );
    }
  } else {
    if (b instanceof Buffer) {
      return Buffer.concat([Buffer.from(a, "utf-8"), b]);
    } else if (typeof b === "object") {
      throw new TypeError(
        `Could not combine the contents of '${indexKey}': cannot merge string with object`
      );
    } else {
      return a + b;
    }
  }
}

/**
 * Merge two configuration files using a combinatoric expansion of various
 * different combinations
 * @param a
 * @param b
 */
export function mergeFiles<
  Opts extends PresetOptions = PresetOptions,
  Args extends ActionArguments = ActionArguments
>(
  indexKey: string,
  a: ConfigFile<PresetRuntimeConfig<Opts>, ArgumentsType<Args>>,
  b: ConfigFile<PresetRuntimeConfig<Opts>, ArgumentsType<Args>>
): ConfigFile<PresetRuntimeConfig<Opts>, ArgumentsType<Args>> {
  const strategy: ConfigFileMergeStrategy = b.combine || "replace";

  if ("generator" in a) {
    // 'a' is a generator
    if ("generator" in b) {
      // 'b' is a generator
      return {
        mimeType: mergeMime(strategy, a.mimeType, b.mimeType),
        generator: (ctx, chain) => {
          const aV = a.generator(ctx, chain);
          const bV = b.generator(ctx, aV);
          return bV;
        },
      };
    } else {
      // 'b' holds static contents
      return {
        mimeType: mergeMime(strategy, a.mimeType, b.mimeType),
        generator: (ctx, chain) => {
          const aV = a.generator(ctx, chain);
          return mergeContents(indexKey, strategy, aV, b.contents);
        },
      };
    }
  } else {
    // 'a' holds static contents
    if ("generator" in b) {
      // 'b' is a generator
      return {
        mimeType: mergeMime(strategy, a.mimeType, b.mimeType),
        generator: (ctx, chain) => {
          const aV = mergeContents(indexKey, strategy, chain || "", a.contents);
          return b.generator(ctx, aV);
        },
      };
    } else {
      // 'b' holds static contents
      return {
        mimeType: mergeMime(strategy, a.mimeType, b.mimeType),
        contents: mergeContents(indexKey, strategy, a.contents, b.contents),
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
export function mergeActions<
  Opts extends PresetOptions = PresetOptions,
  Files extends ConfigFiles<PresetRuntimeConfig<Opts>> = ConfigFiles<
    PresetRuntimeConfig<Opts>
  >,
  Args extends ActionArguments = ActionArguments
>(
  a: Action<Opts, Args, Files>,
  b: Action<Opts, Args, Files>,
  actionName: string
): Action<Opts, Args, Files> {
  const ret: Action<Opts, Args, Files> = {
    files: {},
  };
  const chainFnNames = ["preRun", "run", "postRun"] as const;

  // Combine chainable functions
  for (const fn of chainFnNames) {
    const aFn = a[fn] as ActionHandler<Opts, Args, Files> | undefined;
    const bFn = b[fn] as ActionHandler<Opts, Args, Files> | undefined;

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
    const aFile = a.files ? (a.files as any)[file] : undefined;
    const bFile = b.files ? (b.files as any)[file] : undefined;

    if (aFile && bFile) {
      // When both file configuration are present, we are using the
      // value from 'aFile' as base, and we are merging the results
      // from the 'bFile' on top. However there are a few combinatoric
      // operations we have to handle separately
      (ret.files as any)![file] = mergeFiles<Opts, Args>(
        `${actionName}:${file}`,
        aFile,
        bFile
      );
    } else if (aFile) {
      (ret.files as any)![file] = aFile;
    } else if (bFile) {
      (ret.files as any)![file] = bFile;
    }
  }

  return ret;
}
