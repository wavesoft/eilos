import type { RuntimeContext } from "./struct/RuntimeContext";
import type { SomeUserConfig } from "./types/UserConfig";

export type KeyFilter = (key: string) => boolean;

/**
 * Expand all function branches of the given configuration tree
 *
 * @param {any} obj - The input object to process
 * @param {Object} context - The context object to pass to the function
 * @param {function} keyFilter - Filter function to
 */
function expandFunction(
  obj: any,
  context: RuntimeContext,
  keyFilter: KeyFilter
): any {
  if (Array.isArray(obj)) {
    return obj.map((v) => expandFunction(v, context, keyFilter));
  } else if (obj === null) {
    return null;
  } else if (typeof obj === "object" && obj.constructor === Object) {
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === "@render") {
      return obj["@render"](context);
    }

    return keys.reduce((ret: Record<string, any>, key: string) => {
      if (keyFilter(key)) {
        ret[key] = expandFunction(obj[key], context, keyFilter);
      } else {
        ret[key] = obj[key];
      }
      return ret;
    }, {});
  } else {
    return obj;
  }
}

/**
 * Expands all the parametric values in the user configuration
 *
 * To use a dynamic value, use the { "@render": (ctx) => { ... } }
 * value, for example:
 *
 * {
 *   value: {
 *    "@render": (ctx) => {
 *    ...
 *    }
 *  }
 * }
 *
 * @param config the user configuration object
 * @param context the run-time context to use
 * @param keyFilter an optional function to use for filtering-out keys
 * @returns the user config, with the values patched
 */
export function expandParametricConfig(
  config: SomeUserConfig,
  context: RuntimeContext,
  keyFilter: KeyFilter = () => true
): SomeUserConfig {
  return expandFunction(config, context, keyFilter);
}
