import { Action } from "../types/Action";
import type { Preset } from "../types/Preset";
import type { RuntimeContext } from "./RuntimeContext";

/**
 * Helper to aggregate all project configuration
 */
export class ProjectConfig {
  readonly context: RuntimeContext;
  private preset: Preset;

  constructor(preset: Preset, context: RuntimeContext) {
    this.context = context;
    this.preset = preset;
  }

  getActions(): Action[] {
    return this.preset.actions || [];
  }

  /**
   * Returns the action definition by name
   * @param name the name of the action
   * @returns returns the action definition
   */
  getAction(name: string): Action {
    const action = this.preset.actions!.find((a) => a.name === name);
    if (!action) {
      throw new Error(`Could not find action "${name}" in the preset`);
    }
    return action;
  }
}
