"use strict";

const fs = require("fs");
const path = require("path");
const findUp = require("findup-sync");
const merge = require("deepmerge");
const logger = require("./logger").child({ component: "config" });

const { expandParametricConfig } = require("./env");
const { ProjectConfig } = require("./struct/config");
const { defaultContextForProject } = require("./context");

const PATH_PKGCONF = "package.json";
const PATH_USER = ".eilos.js";
const PATH_BUILD = "build";
const PATH_NODE_MODULES = "node_modules";
const PRESET_PREFIX = "eilos-preset-";

const overwriteMerge = (destinationArray, sourceArray, options) =>
  [].concat(destinationArray, sourceArray);

/**
 * Gets the full path to the elios node module
 *
 * @returns {string}
 */
exports.getEliosModulePath = () => {
  return path.dirname(__filename);
};

/**
 * Gets the top level path of the project aegir is executed in.
 *
 * @returns {string}
 */
exports.getBasePath = () => {
  return process.cwd();
};

/**
 * Gets the path to user's package.json file
 *
 * @returns {string}
 */
exports.getPackageConfigPath = () => {
  return path.join(exports.getBasePath(), PATH_PKGCONF);
};

/**
 * Returns the package configuration contents
 *
 * @returns {Object}
 */
exports.getPackageConfig = () => {
  return require(exports.getPackageConfigPath());
};

/**
 * Gets the `node_modules` directory position
 *
 * @returns {string}
 */
exports.getModulesPath = () => {
  return path.join(exports.getBasePath(), PATH_NODE_MODULES);
};

/**
 * Gets the build directory location
 *
 * @returns {string}
 */
exports.getBuildPath = () => {
  return path.join(exports.getBasePath(), PATH_BUILD);
};

/**
 * Finds the engine configuration file in the project's directory
 *
 * @returns {Object}
 */
exports.getUserConfigPath = function () {
  return findUp(PATH_USER);
};

/**
 * Returns the engine configuration
 *
 * @returns {Object}
 */
exports.getUserConfig = () => {
  let conf = {};
  try {
    const path = exports.getUserConfigPath();
    if (!path) {
      return {};
    }
    conf = require(path);

    const confType = typeof conf;
    if (typeof conf !== "object") {
      logger.error(
        "Invalid eilos configuration: Expecting a JS object, received " +
          confType
      );
    }
  } catch (err) {
    logger.error(
      "Could not process eilos configuration: " +
        (err.message || err.toString())
    );
  }
  return conf;
};

/**
 * Load the package configuration
 */
exports.resolvePackagePath = (name, searchIn = null) => {
  return exports.resolveFilePath(path.join(PATH_NODE_MODULES, name), searchIn);
};

/**
 * Find a file in project directory or in one of the parent directories
 */
exports.resolveFilePath = (name, searchIn = null) => {
  let currentPath = searchIn || exports.getBasePath();

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
};

/**
 * Figure out the name of the preset to use
 *
 * @returns {string}
 */
exports.getPresetName = (engineConf, packageConf) => {
  // First prefer user-specified configuration
  if (engineConf.preset) return engineConf.preset;

  // Then guess the preset by scanning the package configuration names
  const allDeps = Object.assign(
    {},
    packageConf.dependencies,
    packageConf.devDependencies
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
};

/**
 * Load the preset configuration from the given
 */
exports.getPresetConfig = (presetName) => {
  const pkgPath = exports.resolvePackagePath(presetName);
  const presetPkg = require(path.join(pkgPath, "package.json"));
  const presetIndex = path.join(pkgPath, presetPkg.main || "index.js");

  return require(presetIndex);
};

/**
 * Scans the project directory and collects configuration from all known sources:
 *
 * - The user's `.elios.js` or `.elios.json` file
 * - The user's `package.json`
 * - The selected preset
 *
 * @returns {ProjectConfig} - The current project configuration
 */
exports.getProjectConfig = function (context) {
  // When processing the configuration tree, we consider 'parameters'
  // anything that does not start with a '_', that is reserved for the
  // preset configuration. For example 'webpack' or 'jest', etc.
  const expandOnlyConfigBranches = (key) => key[0] !== "_";

  // Figure out the preset to use
  const packageConfig = exports.getPackageConfig();
  const userPkgConfig = packageConfig.eilos || {};
  const userConfig = exports.getUserConfig();
  const presetName = exports.getPresetName(userConfig, packageConfig);

  // Progressively merge configuration from:
  // 1) Preset
  const presetConfig = expandParametricConfig(
    exports.getPresetConfig(presetName),
    context,
    expandOnlyConfigBranches
  );
  context.updateConfig(presetConfig);

  // 2) User config from `package.json``
  context.updateConfig(userPkgConfig);

  // 3) User config from `.eilos.js`
  const expandedUserConfig = expandParametricConfig(
    userConfig,
    context,
    expandOnlyConfigBranches
  );
  context.updateConfig(expandedUserConfig);

  // Also include other useful configuration, such as package.json
  context.updateConfig({
    package: packageConfig,
  });

  // Collect actions configuration
  const actions = merge.all(
    [
      presetConfig._actions || {},
      userPkgConfig._actions || {},
      expandedUserConfig._actions || {},
    ],
    { arrayMerge: overwriteMerge }
  );

  return new ProjectConfig(actions, context);
};

exports.getDefaultProjectConfig = function () {
  const context = defaultContextForProject(exports.getBasePath());
  return exports.getProjectConfig(context);
};

exports.getConfigFile = function (component) {};

exports.getConfigFilePath = function (component) {};
