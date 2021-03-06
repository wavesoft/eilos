"use strict";

const util = require("util");
const path = require("path");
const fs = require("fs");
const fsWriteFile = util.promisify(fs.writeFile);
const fsExists = util.promisify(fs.exists);
const fsMkdir = util.promisify(fs.mkdir);

const logger = require("./logger").child({ component: "files" });
const { getDefaultProjectConfig, getEliosModulePath } = require("./config");

/**
 * Create a javascript file that will call-out to the function handler
 * of the designated action + filename.
 *
 * @param {string} writeTo - Where to write it
 * @param {string} actionName - The name of the action where the file belongs
 * @param {string} filename - The name of the file to generate a function from
 */
function createJsFunctionWrapper(writeTo, actionName, filename) {
  const contents = [
    `const eilos = require(${JSON.stringify(getEliosModulePath())});`,
    "module.exports = eilos.invokeFileFunction(",
    `   ${JSON.stringify(actionName)},`,
    `   ${JSON.stringify(filename)}`,
    ");",
  ].join("\n");

  return fsWriteFile(writeTo, contents);
}

/**
 * Creates a build file, performing all the required
 */
function createActionFile(context, actionRef, fileName) {
  const value = actionRef.files[fileName];
  const writeTo = context.getConfigFilePath(fileName);
  const writeToDir = path.dirname(writeTo);

  // Ensure directory if missing
  return fsExists(writeToDir)
    .then((ok) => {
      if (!ok) {
        logger.debug(`Creating ${writeToDir}`);
        return fsMkdir(writeToDir, { recursive: true });
      }
      return true;
    })
    .then((_) => {
      // On the special case of javascript function, we can create a function
      // execution delegate. This will alow us to forward all the complecity
      // required by the implementation.
      if (writeTo.endsWith(".js") && typeof value === "function") {
        logger.debug(`Writing ${writeTo}`);
        return createJsFunctionWrapper(writeTo, actionRef.name, fileName);
      }

      // Collect the contents to put on the file
      let contents = value;
      if (typeof value === "function") {
        contents = value(context);
      }

      // If the file is a JSON or a JS file and the contents is an object,
      // serialize it using JSON
      if (
        typeof contents !== "string" &&
        (writeTo.endsWith(".js") || writeTo.endsWith(".json"))
      ) {
        contents = JSON.stringify(contents, null, 2);
      }

      logger.debug(`Writing ${writeTo}`);
      return fsWriteFile(writeTo, contents);
    });
}

/**
 * Creates all the build files required for the action
 */
function createAllActionFiles(context, actionRef) {
  return Promise.all(
    Object.keys(actionRef.files).map((fileName) => {
      return createActionFile(context, actionRef, fileName);
    })
  );
}

/**
 * Invoke a function described by the `createJsFunctionWrapper`
 *
 * @param {string} actionName - The name of the action where the file belongs
 * @param {string} filename - The name of the file to generate a function from
 * @returns {any} - Returns whatever the function produced
 */
function invokeFileFunction(actionName, filename) {
  const project = getDefaultProjectConfig();
  const action = project.actions[actionName];
  if (!action) {
    throw new TypeError(
      "Action " + actionName + " was not found in project config"
    );
  }

  const file = action.files[filename];
  if (!file) {
    throw new TypeError(
      "File " + filename + " was not found in action " + actionName
    );
  }

  if (typeof file === "function") {
    return file(project.context);
  }
  return file;
}

module.exports = {
  createAllActionFiles,
  invokeFileFunction,
};
