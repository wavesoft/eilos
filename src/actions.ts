import fs from "fs";
import util from "util";
import rimrafSync from "rimraf";

import loggerBase from "./logger";
import { createAllActionFiles } from "./files";
import { RuntimeContext } from "./struct/RuntimeContext";
import { ProjectConfig } from "./struct/ProjectConfig";
import { Preset } from "./types/Preset";

const fsExists = util.promisify(fs.exists);
const fsMkdir = util.promisify(fs.mkdir);
const rimraf = util.promisify(rimrafSync);
const logger = loggerBase.child({ component: "actions" });

function removeBuildDir(ctx: RuntimeContext): Promise<void> {
  const buildDir = ctx.getDirectory("dist");
  logger.debug(`Removing ${buildDir}`);
  return rimraf(buildDir);
}

function removeConfigDir(ctx: RuntimeContext): Promise<void> {
  const configDir = ctx.getDirectory("dist.config");
  logger.debug(`Removing ${configDir}`);
  return rimraf(configDir);
}

function ensureBuildDir(ctx: RuntimeContext): Promise<boolean> {
  const buildDir = ctx.getDirectory("dist");
  return fsExists(buildDir).then((ok) => {
    if (!ok) {
      logger.debug(`Creating ${buildDir}`);
      return fsMkdir(buildDir, { recursive: true }).then(() => true);
    }
    return false;
  });
}

const defaultPreset: Preset = {
  engineVersion: "*",
  actions: [
    {
      name: "build",
      run: (ctx: RuntimeContext) => {
        return removeBuildDir(ctx);
      },
    },
  ],
};

const defaultPostActions = {};

/**
 * Entry point for invoking a project action
 *
 * @param {ProjectConfig} project - The project configuration
 * @param {string} actionName - The name of the action to invoke
 * @returns {Promise} - Returns a promise that will be resolved when the steps are completed
 */
export function invokeAction(
  project: ProjectConfig,
  actionName: string,
  actionArgs: Record<string, any>
) {
  const ctx = project.context;
  const action = project.getAction(actionName);
  if (action == null) {
    return Promise.reject(
      new TypeError("Action " + actionName + " was not found in project config")
    );
  }

  logger.info(`Performing ${actionName}`);
  const defaultAction = defaultPreset.actions!.find(
    (a) => a.name === actionName
  );
  const preDefault = defaultAction && defaultAction.preRun;
  const preAction = action.preRun;
  const postDefault = defaultAction && defaultAction.postRun;
  const postAction = action.postRun;
  const runAction = action.run;
  const chain: Array<() => Promise<any>> = [];

  // Run early pre-action function
  if (preDefault) chain.push(() => Promise.resolve(preDefault(ctx)));

  // Ensure the build dir is correclty populated
  chain.push(() => Promise.resolve(ensureBuildDir(ctx)));
  chain.push(() => createAllActionFiles(ctx, action));

  // Start the action sequencing
  if (preAction) chain.push(() => Promise.resolve(preAction(ctx)));
  if (runAction) chain.push(() => Promise.resolve(runAction(ctx)));
  if (postAction) chain.push(() => Promise.resolve(postAction(ctx)));
  if (postDefault) chain.push(() => Promise.resolve(postDefault(ctx)));

  // We don't need the config dir after we are done unless we are running in debug mode
  if (!ctx.getConfig("debug", false)) {
    chain.push(() => Promise.resolve(removeConfigDir(ctx)));
  }

  return chain.reduce((promise, chain) => {
    return promise.then(chain);
  }, Promise.resolve(null));
}
