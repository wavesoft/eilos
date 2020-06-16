'use strict'

/**
 * Expand all function branches of the given configuration tree
 *
 * @param {any} obj - The input object to process
 * @param {Object} context - The context object to pass to the function
 * @param {function} keyFilter - Filter function to
 */
function expandFunction (obj, context, keyFilter) {
  if (typeof obj === 'object') {
    return Object.keys(obj).reduce((ret, key) => {
      if (keyFilter(key)) {
        ret[key] = expandFunction(obj[key], context, keyFilter)
      } else {
        ret[key] = obj[key]
      }
      return ret
    }, {})
  } else if (Array.isArray(obj)) {
    return obj.map(v => expandFunction(v, context), keyFilter)
  } else if (typeof obj === 'function') {
    return obj(context)
  } else {
    return obj
  }
}

exports.expandParametricConfig = (config, context, keyFilter = () => true) => {
  return expandFunction(config, context, keyFilter)
}
