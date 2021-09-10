import fs from "fs";
import path from "path";
import util from "util";

import { getEliosModulePath } from "../config";
import loggerBase from "../logger";
import type { ConfigFile, ConfigFileContents } from "../types/ConfigFile";
import type { ProjectConfig } from "../struct/ProjectConfig";
import type { RuntimeContext } from "../struct/RuntimeContext";

const fsReadFile = util.promisify(fs.readFile);
const fsWriteFile = util.promisify(fs.writeFile);
const fsMkdir = util.promisify(fs.mkdir);
const logger = loggerBase.child({ component: "files" });

/**
 * Returns the file contents as binary buffer
 * @param c the file contents to process
 * @returns the resulting buffer
 */
export function getContentsBuffer(c: ConfigFileContents): Buffer {
  if (c instanceof Buffer) {
    return c;
  } else if (typeof c === "object") {
    return Buffer.from(JSON.stringify(c, null, 2), "utf-8");
  } else {
    return Buffer.from(c, "utf-8");
  }
}

/**
 * Renders the given config file on a buffer
 * @param file the file to render
 */
export async function getFileContents(
  ctx: RuntimeContext,
  file: ConfigFile<any, any>,
  fileName: string,
  actionName?: string
): Promise<Buffer> {
  // If this is an output file, read it's contents from the disk
  if ("output" in file) {
    return fsReadFile(fileName);
  }

  // If we have a generator, the contents can either be static or dynamic
  if ("generator" in file) {
    if (file.mimeType === "application/javascript" && actionName) {
      const modulePath = getEliosModulePath();
      const frozenContext = ctx.freeze();
      logger.silly(
        `Creating wrapper function for file '${fileName}' -> ` +
          `${modulePath} invokeFileFunction("${actionName}", "${fileName}", context)`
      );
      logger.silly(`Freezing context to: ${JSON.stringify(frozenContext)}`);

      // When rendering js contents, create a wrapper function
      const contents = [
        `const eilos = require(${JSON.stringify(modulePath)});`,
        `const context = ${JSON.stringify(frozenContext)};`,
        "module.exports = eilos.invokeFileFunction(",
        `   ${JSON.stringify(actionName)},`,
        `   ${JSON.stringify(fileName)},`,
        `   context`,
        ");",
      ].join("\n");
      return getContentsBuffer(contents);
    } else {
      logger.silly(`Using generator for file '${fileName}'`);
      // When rendering non-js contents just process the buffer
      const data = await file.generator(ctx);
      return getContentsBuffer(data);
    }
  }

  // Otherwise return the buffer
  logger.silly(`Using buffered contents for file '${fileName}'`);
  return getContentsBuffer(file.contents);
}

/**
 * Creates all the build files required for the action
 */
export function createAllActionFiles(
  project: ProjectConfig,
  actionName: string
) {
  const ctx = project.context;
  const files = project.getActionFiles(actionName);

  return Promise.all(
    Object.keys(files).map(async (fileName) => {
      // Compute the destination for the file
      const writeTo = ctx.getConfigFilePath(fileName);
      const writeToDir = path.dirname(writeTo);

      // Make sure directory exists
      const dirExists = fs.existsSync(writeToDir);
      if (!dirExists) {
        logger.debug(`Creating missing directory ${writeToDir}`);
        await fsMkdir(writeToDir, { recursive: true }).then(() => true);
      }

      // Collect file contents
      const contents = await getFileContents(
        ctx,
        files[fileName],
        fileName,
        actionName
      );

      logger.debug(`Writing file ${writeTo}'`);
      await fsWriteFile(writeTo, contents.toString());
    })
  );
}
