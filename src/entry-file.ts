import { getDefaultProjectConfig } from "./config";

/**
 * Invoke a function described by the `createJsFunctionWrapper`
 *
 * @param {string} actionName - The name of the action where the file belongs
 * @param {string} fileName - The name of the file to generate a function from
 * @returns {any} - Returns whatever the function produced
 */
export function invokeFileFunction(actionName: string, fileName: string) {
  const project = getDefaultProjectConfig();

  // Get the action configuration
  const action = project.getAction(actionName);
  if (!action) {
    throw new TypeError(
      "Action " + actionName + " was not found in project config"
    );
  }

  // Get the file configuration
  const fileConfig = project.getFile(fileName, actionName);
  if (!fileConfig) {
    throw new TypeError(
      "File " + fileName + " was not found in action " + actionName
    );
  }

  // Either call-out to the generator or fetch the contents
  if ("generator" in fileConfig) {
    return fileConfig.generator(project.context);
  } else {
    return fileConfig.contents;
  }
}
