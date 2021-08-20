import { PresetConfig } from "./PresetConfig";
import type { OptionDataType } from "./RuntimeConfig";
import type { BaseUserConfig } from "./UserConfig";

/**
 * The API interface of the user configuration
 */
export type PresetUserConfig<C> = C extends PresetConfig<
  infer Opt,
  any
>
  ? Partial<{
      [K in keyof Opt]: Opt[K] extends { schema: infer S }
        ? OptionDataType<S>
        : any;
    } &
      BaseUserConfig>
  : never;
