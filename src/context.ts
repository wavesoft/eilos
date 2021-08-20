import path from "path";
import { RuntimeContext } from "./struct/RuntimeContext";

/**
 * Create a new run-time context to use for a project under the given path
 * @param projectPath the base path to the project
 * @returns the newly created runtime context
 */
export function defaultContextForProject(projectPath: string) {
  const ctx = new RuntimeContext(
    {
      NODE_ENV: "development",
      ...process.env,
    },
    {
      project: projectPath,
      "project.src": path.join(projectPath, "src"),
      dist: path.join(projectPath, "dist"),
      static: path.join(projectPath, "static"),
      "dist.config": path.join(projectPath, "dist", ".config"),
    }
  );
  return ctx;
}
