"use strict";

const merge = require("deepmerge");
const path = require("path");
const execa = require("execa");
const logger = require("./logger").child({ component: "conntext" });
const config = require("./config");

const overwriteMerge = (destinationArray, sourceArray, options) =>
  [].concat(destinationArray, sourceArray);

class Context {
  constructor() {
    this.util = {
      merge: (...args) => merge.all(args, { arrayMerge: overwriteMerge }),
    };
    this._env = {};
    this._dir = {};
    this._config = {};
    this._config_files = {};
    this.logger = logger;
  }

  isDevelop() {
    return this.getMode() === "development";
  }

  isProduction() {
    return this.getMode() === "production";
  }

  getMode() {
    return this._env.NODE_ENV || "development";
  }

  setDirectory(name, path) {
    this._dir[name] = path;
    return this;
  }

  updateConfig(obj) {
    this._config = merge(this._config, obj, { arrayMerge: overwriteMerge });
  }

  getConfig(name, defaults = null) {
    const value = this._config[name];
    if (typeof value === "object" && !Array.isArray(value)) {
      return Object.assign({}, defaults, value);
    } else {
      return value || defaults;
    }
  }

  getConfigFilePath(name) {
    if (this._config_files[name] == null) {
      this._config_files[name] = null;
    }
    return path.join(this.getDirectory("dist.config"), name);
  }

  addConfigFile(name, contents) {
    this._config_files[name] = contents;
  }

  getDirectory(name) {
    if (this._dir[name] == null) {
      throw new Error(`Directory "${name}" was not defined`);
    }
    return this._dir[name];
  }

  resolveFilePath(name, searchIn = null) {
    return config.resolveFilePath(name, searchIn);
  }

  exec(binary, args = [], options = {}) {
    logger.debug(`Invoking ${binary} ${args.join(" ")}`);
    return execa(
      binary,
      args,
      merge(
        {
          localDir: this.getDirectory("project"),
          preferLocal: true,
          stdio: "inherit",
          env: this._env,
        },
        options
      )
    );
  }
}

function defaultContextForProject(projectPath) {
  const ctx = new Context();
  ctx._config = {};
  ctx._env = Object.assign(
    {
      NODE_ENV: "development",
    },
    process.env
  );
  ctx._dir = {
    project: projectPath,
    "project.src": path.join(projectPath, "src"),
    dist: path.join(projectPath, "dist"),
    static: path.join(projectPath, "static"),
    "dist.config": path.join(projectPath, "dist", ".config"),
  };
  return ctx;
}

function getProjectContext() {
  const context = defaultContextForProject(getBasePath());
  const config = getProjectConfig(context);
}

module.exports = {
  Context,
  defaultContextForProject,
};
