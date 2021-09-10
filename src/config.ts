import fs from "fs";
import path from "path";
import findUp from "findup-sync";
import Ajv from "ajv/dist/jtd";
import type { SomeJTDSchemaType } from "ajv/dist/types/jtd-schema";
import semver from "semver";

import { defaultContextForProject } from "./context";
import { expandParametricConfig } from "./env";
import { ProjectConfig } from "./struct/ProjectConfig";
import { FrozenRuntimeContext, RuntimeContext } from "./struct/RuntimeContext";
import loggerBase from "./logger";
import type { Action } from "./types/Action";
import type { Preset } from "./types/Preset";
import type { SomeUserConfig } from "./types/UserConfig";
import type { SomeRuntimeConfig } from "./types";

import packageConfig from "../package.json";

const logger = loggerBase.child({ component: "config" });

const PATH_PKGCONF = "package.json";
const PATH_USER = ".eilos.js";
const PATH_BUILD = "build";
const PATH_NODE_MODULES = "node_modules";
const PRESET_PREFIX = "eilos-preset-";

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
  const pkgPath = findUp("package.json", {});
  if (pkgPath == null) {
    throw new Error(`Could not find 'package.json' in the current directory!`);
  }
  return path.dirname(pkgPath);
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
function getUserConfigFrom(path: string): SomeUserConfig | null {
  try {
    const conf = __non_webpack_require__(path);
    const confType = typeof conf;
    if (typeof conf !== "object") {
      throw new Error(
        "Invalid eilos configuration: Expecting a JS object, received " +
          confType
      );
    }
    logger.debug(`Loaded user configuration from ${path}`);
    return conf as SomeUserConfig;
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
function getUserConfigFromEilosFile(): SomeUserConfig | null {
  const foundJson = findUp(".eilos.json", {});
  const foundJs = findUp(".eilos.js", {});
  const userFile = foundJson || foundJs;

  logger.silly(`Found .eilos.json at ${foundJson}`);
  logger.silly(`Found .eilos.js at ${foundJs}`);

  if (userFile) {
    return getUserConfigFrom(userFile);
  }

  return null;
}

/**
 * Loads the user configuration from the package.json
 */
function getUserConfigFromPackage(packageJson: any): SomeUserConfig | null {
  if ("eilos" in packageJson) {
    return packageJson["eilos"] as SomeUserConfig;
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
function getUserConfig(packageJson: any): SomeUserConfig {
  const userFile = getUserConfigFromEilosFile();
  const userJson = getUserConfigFromPackage(packageJson);

  // Validate that no many configuration locations are used
  if (userFile != null && userJson != null) {
    throw new Error(
      `Encountered both an .eilos user file AND an "eilos" property in package.json. Please pick either of them.`
    );
  }

  if (userFile) {
    logger.debug(`Using user customizations from .eilos file`);
    return userFile;
  }
  if (userJson) {
    logger.debug(`Using user customizations from package.json`);
    return userJson;
  }

  logger.debug(`Did not load any user customizations`);
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
function getPresetName(userConfig: SomeUserConfig, packageJson: any): string {
  // First prefer user-specified configuration
  if (userConfig.eilosPreset) return userConfig.eilosPreset;

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
 * Load the preset configuration from the given package name
 */
function loadPresetFromPackage(presetName: string): Preset {
  const pkgPath = resolvePackagePath(presetName);
  logger.silly(`Resolved preset package at ${pkgPath}`);

  const presetPkg = __non_webpack_require__(path.join(pkgPath, "package.json"));
  logger.silly(
    `Read package.json contents: ${JSON.stringify(pkgPath, null, 2)}`
  );

  const presetIndex = path.join(pkgPath, presetPkg.main || "index.js");
  logger.silly(`Resolved index at: ${presetIndex}`);

  // Check for ES6/CommonJS module format
  const ret = __non_webpack_require__(presetIndex);
  if (ret.default) return ret.default;
  return ret;
}

/**
 * Include custom actions from the user config into the package preset
 * @param packagePreset
 * @param userConfig
 */
function composePreset(
  packagePreset: Preset,
  userConfig: SomeUserConfig
): Preset {
  const preset = Object.assign({}, packagePreset); // Shallow copy

  // Make sure all the required fields are present
  if (!preset.actions) preset.actions = {};
  if (!preset.config) preset.config = {};

  // If we have custom actions from the user, bring them in
  if (userConfig.eilosActions) {
    for (const name in userConfig.eilosActions) {
      const prevAction = (preset.actions as Record<string, Action>)[name];
      const action = userConfig.eilosActions[name];

      if (prevAction) {
        logger.debug(
          `Overriding preset action '${name}' using custom action config`
        );
        Object.assign(prevAction, action);
      } else {
        preset.actions[name] = action;
      }
    }
  }

  return preset;
}

/**
 * Validate the values for the options given
 * @param preset the preset to extract the option configuration from
 * @param config the evaluated runtime configuration
 */
function validateOptions(preset: Preset, config: SomeRuntimeConfig) {
  let isCritical: boolean = false;
  const ajv = new Ajv();

  if (preset.config.options) {
    const knownOptions: string[] = [];

    // Validate present options
    for (const key in preset.config.options) {
      knownOptions.push(key);
      const opt = preset.config.options![key];
      const cfgValue = config[key];

      // Warn for deprecated configuration options used
      if (opt.deprecated && cfgValue != null) {
        logger.warn(
          `Configuration option '${key}' is deprecated: ${opt.deprecated}`
        );
        continue;
      }

      // Warn for not given, required options
      if (opt.required && cfgValue == null) {
        logger.error(
          `Required configuration option '${key}' was not specified`
        );
        isCritical = true;
        continue;
      }

      // Warn for mismatching value
      if (opt.schema && cfgValue != null) {
        const schemaArr: ReadonlyArray<SomeJTDSchemaType> = Array.isArray(
          opt.schema
        )
          ? opt.schema
          : [opt.schema];

        for (let i = 0, l = schemaArr.length; i < l; ++i) {
          const schema = schemaArr[i];
          const validationErrors: string[] = [];

          try {
            const validate = ajv.compile(schema as any);
            const valid = validate(cfgValue);
            if (!valid) {
              for (const err of validate.errors!) {
                validationErrors.push(
                  `Validation error on option '${key}': ${err.schemaPath}: ${err.message}`
                );
              }
            }
          } catch (e) {
            throw new TypeError(
              `Preset schema validation error for option '${key}${
                l > 1 ? `/#${i}` : ``
              }': ${e.message || e.toString()}`
            );
          }

          // If all validations failed, show the warnings
          if (validationErrors.length == l) {
            isCritical = true;
            for (const msg of validationErrors) {
              logger.error(msg);
            }
          }
        }
      }
    }

    // Collect unknown options
    const unknownOpts: string[] = [];
    for (const key in config) {
      if (!knownOptions.includes(key)) unknownOpts.push(key);
    }
    if (unknownOpts.length) {
      logger.error(`Unknown configuration options: ${unknownOpts.join(", ")}`);
      isCritical = true;
    }
  }

  // If we have a critical error, exit
  if (isCritical) {
    throw new TypeError(`Cannot continue due to configuration errors`);
  }
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
  const packageJson = __non_webpack_require__(packageJsonPath);
  logger.debug(`Found project config at '${packageJsonPath}'`);

  // Then load the user config from the relevant sources
  const userConfigBase = getUserConfig(packageJson);
  const userConfig = expandParametricConfig(userConfigBase, context);
  logger.silly(
    `Discovered user config: ${JSON.stringify(userConfig, null, 2)}`
  );

  // Figure out which preset to use and load it from file
  const presetName = getPresetName(userConfig, packageJson);
  const packagePreset = loadPresetFromPackage(presetName);
  logger.debug(`Using preset '${presetName}'`);

  // Include custom actions int he preset
  const preset = composePreset(packagePreset, userConfig);
  logger.silly(
    `Found actions in preset: ${Object.keys(preset.actions || {}).join(", ")}`
  );

  // Validate preset semver
  logger.silly(
    `Cehcking if engine verion ${packageConfig.version} satisfies requierement of ${preset.engineVersion}`
  );
  const presetEngineVersion = preset.engineVersion || "0.9";
  if (!semver.satisfies(packageConfig.version, presetEngineVersion)) {
    throw new TypeError(
      `Eilos version (${packageConfig.version}) is not compatible with the version required by the preset: ${preset.engineVersion}`
    );
  }

  // Expose preset file configuration in context
  if (preset.config.files) {
    for (const fileName in preset.config.files) {
      const file = preset.config.files[fileName];
      context.setConfigFile(fileName, file);
    }
  }

  // Create a project config
  const config = new ProjectConfig(preset, context);

  // Collect run-time config and validate it
  const runtimeConfig = config.getRuntime(userConfig);
  logger.silly(
    `Composed runtime config: ${JSON.stringify(runtimeConfig, null, 2)}`
  );

  config.context.updateOptions(runtimeConfig);
  validateOptions(preset, runtimeConfig);
  return config;
}

export function getDefaultProjectConfig() {
  const context = defaultContextForProject(getProjectRoot());
  return getProjectConfig(context);
}

export function getThawedProjectConfig(config: FrozenRuntimeContext) {
  // Recover the run-time environment config
  if (config.options.logLevel) logger.level = config.options.logLevel;
  logger.silly(`Thawing frozen configuration: ${config}`);

  // Restore project config and thaw it
  const context = defaultContextForProject(getProjectRoot());
  context.thaw(config);
  return getProjectConfig(context);
}
