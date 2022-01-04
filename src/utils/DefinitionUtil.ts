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
import loggerBase from "../logger";

const logger = loggerBase.child({ component: "files" });

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
  logger.silly(`-- Merging with strategy '${strategy}'`);
  if (strategy === "replace" || a == null) {
    logger.silly(`--- Replacing contents`);
    return b;
  }

  if (a instanceof Buffer) {
    if (b instanceof Buffer) {
      logger.silly(`--- Merging buffer-buffer (concat)`);
      return Buffer.concat([a, b]);
    } else if (typeof b === "object") {
      logger.silly(`--- Merging buffer-object (invalid)`);
      throw new TypeError(
        `Could not combine the contents of '${indexKey}': cannot merge buffer with object`
      );
    } else {
      logger.silly(`--- Merging buffer-string (concat)`);
      return Buffer.concat([a, Buffer.from(b, "utf-8")]);
    }
  } else if (typeof a === "object") {
    if (b instanceof Buffer) {
      logger.silly(`--- Merging object-buffer (invalid)`);
      throw new TypeError(
        `Could not combine the contents of '${indexKey}': cannot merge object with buffer`
      );
    } else if (typeof b === "object") {
      logger.silly(`--- Merging object-object (object-merge)`);
      return mergeObjects({}, a, b);
    } else {
      logger.silly(`--- Merging object-string (invalid)`);
      throw new TypeError(
        `Could not combine the contents of '${indexKey}': cannot merge buffer with object`
      );
    }
  } else {
    if (b instanceof Buffer) {
      logger.silly(`--- Merging buffer-string (concat)`);
      return Buffer.concat([Buffer.from(a, "utf-8"), b]);
    } else if (typeof b === "object") {
      logger.silly(`--- Merging object-string (invalid)`);
      throw new TypeError(
        `Could not combine the contents of '${indexKey}': cannot merge string with object`
      );
    } else {
      logger.silly(`--- Merging string-string (concat)`);
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

  logger.silly(`Merging '${indexKey}' with two configuration:`);
  logger.silly(`- a: ${JSON.stringify(a, null, 2)}`);
  if ("generator" in a) {
    logger.silly(`- generator source a: ${a.generator.toString()}`);
  }
  logger.silly(`- b: ${JSON.stringify(b, null, 2)}`);
  if ("generator" in b) {
    logger.silly(`- generator source b: ${b.generator.toString()}`);
  }

  if ("output" in a) {
    // 'a' is an output file
    if ("output" in b) {
      // 'b' is output file
      logger.silly(`- Using output-output merge strategy`);
      return {
        mimeType: mergeMime(strategy, a.mimeType, b.mimeType),
        combine: strategy,
        output: true,
      };
    } else if ("generator" in b) {
      // 'b' is a generator
      logger.silly(`- Using output-generator merge strategy (invalid)`);
      throw new TypeError(`Cannot combine output and input files`);
    } else {
      // 'b' holds static contents
      logger.silly(`- Using output-static merge strategy (invalid)`);
      throw new TypeError(`Cannot combine output and input files`);
    }
  } else if ("generator" in a) {
    const aGenerator = a.generator;

    // 'a' is a generator
    if ("output" in b) {
      // 'b' is output file
      logger.silly(`- Using generator-output merge strategy`);
      throw new TypeError(`Cannot combine output and input files`);
    } else if ("generator" in b) {
      const bGenerator = b.generator;

      // 'b' is a generator
      logger.silly(`- Using generator-generator merge strategy`);
      const mimeType = mergeMime(strategy, a.mimeType, b.mimeType);
      logger.silly(`- mimeType: ${mimeType}`);

      return {
        mimeType,
        generator: (ctx, chain) => {
          logger.silly(`Running generator-generator merger for '${indexKey}'`);
          logger.silly(`- chain: ${JSON.stringify(chain, null, 2)}`);
          logger.silly(`- generator source a: ${aGenerator.toString()}`);
          const aV = aGenerator(ctx, chain);
          logger.silly(`- generator a: ${JSON.stringify(aV, null, 2)}`);
          logger.silly(`- generator source b: ${bGenerator.toString()}`);
          const bV = bGenerator(ctx, aV);
          logger.silly(`- generator b (result): ${JSON.stringify(bV, null, 2)}`);
          return bV;
        },
      };
    } else {
      // 'b' holds static contents
      logger.silly(`- Using generator-static merge strategy`);
      const mimeType = mergeMime(strategy, a.mimeType, b.mimeType);
      logger.silly(`- mimeType: ${mimeType}`);
      return {
        mimeType,
        generator: (ctx, chain) => {
          logger.silly(`Running generator-static merger for '${indexKey}'`);
          logger.silly(`- chain: ${JSON.stringify(chain, null, 2)}`);
          logger.silly(`- generator source a: ${aGenerator.toString()}`);
          const aV = aGenerator(ctx, chain);
          logger.silly(`- generator a: ${JSON.stringify(aV, null, 2)}`);
          logger.silly(`- static data: ${JSON.stringify(b.contents, null, 2)}`);
          const bV = mergeContents(indexKey, strategy, aV, b.contents);
          logger.silly(`- result: ${JSON.stringify(bV, null, 2)}`);
          return bV;
        },
      };
    }
  } else {
    // 'a' holds static contents
    if ("output" in b) {
      // 'b' is output file
      logger.silly(`- Using static-output merge strategy (invalid)`);
      throw new TypeError(`Cannot combine output and input files`);
    } else if ("generator" in b) {
      const bGenerator = b.generator;

      // 'b' is a generator
      logger.silly(`- Using static-generator merge strategy`);
      const mimeType = mergeMime(strategy, a.mimeType, b.mimeType);
      logger.silly(`- mimeType: ${mimeType}`);
      return {
        mimeType: mergeMime(strategy, a.mimeType, b.mimeType),
        generator: (ctx, chain) => {
          logger.silly(`Running static-generator merger for '${indexKey}'`);
          logger.silly(`- chain: ${JSON.stringify(chain, null, 2)}`);
          const aV = mergeContents(indexKey, strategy, chain || "", a.contents);
          logger.silly(`- static data: ${JSON.stringify(aV, null, 2)}`);
          logger.silly(`- generator source b: ${bGenerator.toString()}`);
          const bV = bGenerator(ctx, aV);
          logger.silly(
            `- generator b (result): ${JSON.stringify(bV, null, 2)}`
          );
          return bV;
        },
      };
    } else {
      // 'b' holds static contents
      logger.silly(`- Using static-static merge strategy`);
      const contents = mergeContents(
        indexKey,
        strategy,
        a.contents,
        b.contents
      );
      const mimeType = mergeMime(strategy, a.mimeType, b.mimeType);
      logger.silly(`- mimeType: ${mimeType}`);
      logger.silly(`- contents a: ${JSON.stringify(a.contents, null, 2)}`);
      logger.silly(`- contents b: ${JSON.stringify(b.contents, null, 2)}`);
      logger.silly(`- result: ${JSON.stringify(contents, null, 2)}`);

      return {
        mimeType,
        contents,
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
