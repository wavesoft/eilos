"use strict";

/**
 * Expand all function branches of the given configuration tree
 *
 * @param {any} obj - The input object to process
 * @param {Object} context - The context object to pass to the function
 * @param {function} keyFilter - Filter function to
 */
function expandFunction(obj, context, keyFilter) {
  if (Array.isArray(obj)) {
    return obj.map((v) => expandFunction(v, context, keyFilter));
  } else if (obj === null) {
    return null;
  } else if (typeof obj === "object" && obj.constructor === Object) {
    const keys = Object.keys(obj);
    if (keys.length === 1 && keys[0] === "@render") {
      return obj["@render"](context);
    }

    return keys.reduce((ret, key) => {
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

exports.expandParametricConfig = (config, context, keyFilter = () => true) => {
  return expandFunction(config, context, keyFilter);
};

// function merge(a, b) {
//   // Type changes and non-objects get overwritten with the newer value
//   if (typeof a != typeof b || typeof b !== "object") {
//     return b;
//   }

//   // Arrays are merged, unless `b` is not an array, in which case `a` is
//   // replaced with b.
//   if (Array.isArray(a)) {
//     if (!Array.isArray(b)) return b;
//     return [].concat(a, b);
//   }
// }
// exports.merge = (...objects) => {};
