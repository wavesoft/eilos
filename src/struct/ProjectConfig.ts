import { Action } from "../types/Action";
import { PresetRuntimeConfig } from "../types/RuntimeConfig";
import { UserConfig } from "../types/UserConfig";
import type { Preset, PresetOptions } from "../types/Preset";
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

  getRuntime<O extends PresetOptions>(
    user: UserConfig
  ): PresetRuntimeConfig<O> {
    const ret: any = {};

    // Process the options from the preset
    if (this.preset.options) {
      Object.keys(this.preset.options).forEach((key) => {
        const opt = this.preset.options![key];
        const userValue = user[key];
        if (userValue == null) {
          if (opt.defaultValue != null) {
            ret[key] = opt.defaultValue;
          }
        } else {
          ret[key] = userValue;
        }
      });
    }

    return ret;
  }

  getActions(): (Action & { name: string })[] {
    return Object.keys(this.preset.actions || {}).map((key) => {
      return {
        ...this.preset.actions![key],
        name: key,
      };
    });
  }

  /**
   * Returns the action definition by name
   * @param name the name of the action
   * @returns returns the action definition
   */
  getAction(name: string): Action {
    const action = (this.preset.actions as Record<string, Action>)[
      name
    ];
    if (!action) {
      throw new Error(`Could not find action "${name}" in the preset`);
    }
    return action;
  }
}
