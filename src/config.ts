import fs from "fs";
import path from "path";
import findUp from "findup-sync";

import { defaultContextForProject } from "./context";
import { expandParametricConfig } from "./env";
import { Preset } from "./types/Preset";
import { RuntimeContext } from "./struct/RuntimeContext";
import { UserConfig } from "./types/UserConfig";
import loggerBase from "./logger";
import { ProjectConfig } from "./struct/ProjectConfig";

const logger = loggerBase.child({ component: "config" });

const PATH_PKGCONF = "package.json";
const PATH_USER = ".eilos.js";
const PATH_BUILD = "build";
const PATH_NODE_MODULES = "node_modules";
const PRESET_PREFIX = "eilos-preset-";

const overwriteMerge = (
  destinationArray: any[],
  sourceArray: any[],
  options: any
) => [].concat(destinationArray, sourceArray);

/**
 * Gets the full path to the elios node module
 *
 * @returns {string}
 */
export function getEliosModulePath(): string {
  return path.dirname(__filename);
}

/**
 * Gets the top level path of the project eilos is executed in.
 *
 * @returns {string}
 */
function getProjectRoot(): string {
  const path = findUp("package.json", {});
  if (path == null) {
    throw new Error(`Could not find 'package.json' in the current directory!`);
  }
  return path;
}

/**
 * Gets the path to user's package.json file
 *
 * @returns {string}
 */
function getPackageConfigPath(): string {
  return path.join(getProjectRoot(), PATH_PKGCONF);
}

/**
 * Gets the `node_modules` directory position
 *
 * @returns {string}
 */
function getModulesPath(): string {
  return path.join(getProjectRoot(), PATH_NODE_MODULES);
}

/**
 * Gets the build directory location
 *
 * @returns {string}
 */
function getBuildPath(): string {
  return path.join(getProjectRoot(), PATH_BUILD);
}

/**
 * Returns the engine configuration from the given file
 */
function getUserConfigFrom(path: string): UserConfig | null {
  try {
    const conf = require(path);
    const confType = typeof conf;
    if (typeof conf !== "object") {
      throw new Error(
        "Invalid eilos configuration: Expecting a JS object, received " +
          confType
      );
    }
    logger.debug(`Loaded user configuration from ${path}`);
    return conf as UserConfig;
  } catch (err) {
    throw new Error(
      "Could not process eilos configuration: " +
        (err.message || err.toString())
    );
  }

  return null;
}

/**
 * Finds the engine configuration file in the project's directory
 *
 * @returns {Object}
 */
function getUserConfigFromEilosFile(): UserConfig | null {
  const foundJson = findUp(".eilos.json", {});
  const foundJs = findUp(".eilos.json", {});
  const userFile = foundJson || foundJs;

  if (userFile) {
    return getUserConfigFrom(userFile);
  }

  return null;
}

/**
 * Loads the user configuration from the package.json
 */
function getUserConfigFromPackage(packageJson: any): UserConfig | null {
  if ("eilos" in packageJson) {
    return packageJson["eilos"] as UserConfig;
  }
  return null;
}

/**
 * Load the user configuration by searching through known locations
 *
 * - The user's `.elios.js` or `.elios.json` file
 * - The user's `package.json`
 * - The selected preset
 */
function getUserConfig(packageJson: any): UserConfig {
  const userFile = getUserConfigFromEilosFile();
  const userJson = getUserConfigFromPackage(packageJson);

  // Validate that no many configuration locations are used
  if (userFile != null && userJson != null) {
    throw new Error(
      `Encountered both an .eilos user file AND an "eilos" property in package.json. Please pick either of them.`
    );
  }

  if (userFile) {
    logger.debug(`Using user configuration from .eilos file`);
    return userFile;
  }
  if (userJson) {
    logger.debug(`Using user configuration from package.json`);
    return userJson;
  }

  logger.debug(`Did not load any user configuration`);
  return {};
}

/**
 * Load the package configuration
 */
export function resolvePackagePath(name: string, searchIn?: string) {
  return resolveFilePath(path.join(PATH_NODE_MODULES, name), searchIn);
}

/**
 * Find a file in project directory or in one of the parent directories
 */
export function resolveFilePath(name: string, searchIn?: string) {
  let currentPath = searchIn || getProjectRoot();

  while (currentPath && currentPath !== "/") {
    const filePath = path.join(currentPath, name);
    try {
      fs.statSync(filePath);
      return filePath;
    } catch (err) {
      // If file wasn't found try the parent
      if (err.errno === -2) {
        currentPath = path.dirname(currentPath);
      } else {
        throw err;
      }
    }
  }

  throw "Could not resolve file path: " + name;
}

/**
 * Figure out the name of the preset to use
 *
 * @returns {string}
 */
function getPresetName(userConfig: UserConfig, packageJson: any): string {
  // First prefer user-specified configuration
  if (userConfig.preset) return userConfig.preset;

  // Then guess the preset by scanning the package configuration names
  const allDeps = Object.assign(
    {},
    packageJson.dependencies,
    packageJson.devDependencies
  );
  const pkgPresets = Object.keys(allDeps).filter((k) =>
    k.startsWith(PRESET_PREFIX)
  );

  if (pkgPresets.length === 1) {
    return pkgPresets[0];
  } else if (pkgPresets.length > 1) {
    throw new Error(
      `Found more than 1 preset on your 'devDependencies', please specify which one to use in your ${PATH_USER} file`
    );
  }

  throw new Error("Could not find a preset to use");
}

/**
 * Load the preset configuration from the given
 */
function loadPresetFromPackage(presetName: string): Preset {
  const pkgPath = resolvePackagePath(presetName);
  const presetPkg = require(path.join(pkgPath, "package.json"));
  const presetIndex = path.join(pkgPath, presetPkg.main || "index.js");

  return require(presetIndex);
}

/**
 * Include custom actions from the user config into the package preset
 * @param packagePreset
 * @param userConfig
 */
function composePreset(packagePreset: Preset, userConfig: UserConfig): Preset {
  const preset = Object.assign({}, packagePreset); // Shallow copy

  // Make sure all the required fields are present
  if (!preset.actions) preset.actions = [];
  if (!preset.options) preset.options = {};

  // If we have custom actions from the user, bring them in
  if (userConfig.eilosActions) {
    for (const action of userConfig.eilosActions) {
      const prevAction = preset.actions!.find((a) => a.name === action.name);
      if (prevAction) {
        logger.debug(
          `Overriding preset action '${action.name}' using custom action config`
        );
        Object.assign(prevAction, action);
      } else {
        preset.actions.push(action);
      }
    }
  }

  return preset;
}

/**
 * Scans through the project files and configuration and creates the
 * overall project configuration that is later used in all of the components.
 * @param context
 * @returns
 */
function getProjectConfig(context: RuntimeContext) {
  // Load the project's 'package.json' that we are using
  // for various different purposes.
  const packageJsonPath = getPackageConfigPath();
  const packageJson = require(packageJsonPath);
  logger.debug(`Found project config at '${packageJsonPath}'`);

  // Then load the user config from the relevant sources
  const userConfigBase = getUserConfig(packageJson);
  const userConfig = expandParametricConfig(userConfigBase, context);

  // Figure out which preset to use and load it from file
  const presetName = getPresetName(userConfig, packageJson);
  const packagePreset = loadPresetFromPackage(presetName);
  logger.debug(`Using preset '${presetName}'`);

  // Include custom actions int he preset
  const preset = composePreset(packagePreset, userConfig);

  // Initialize the project config
  return new ProjectConfig(preset, context);
}

export function getDefaultProjectConfig() {
  const context = defaultContextForProject(getProjectRoot());
  return getProjectConfig(context);
}

function getConfigFile(component) {}

function getConfigFilePath(component) {}
