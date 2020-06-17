const fs = require('fs')
const rimraf = require('rimraf')

const actions = require('./logger').child({ component: 'files' })
const { createAllActionFiles } = require('./files')

function removeBuildDir (ctx) {
  const builDir = ctx.getDirectory('dist')
  actions.debug(`Removing ${builDir}`)
  rimraf.sync(builDir)
}

function removeConfigDir (ctx) {
  const configDir = ctx.getDirectory('dist.config')
  actions.debug(`Removing ${configDir}`)
  rimraf.sync(configDir)
}

function ensureBuildDir (ctx) {
  const builDir = ctx.getDirectory('dist')
  if (!fs.existsSync(builDir)) {
    actions.debug(`Creating ${builDir}`)
    fs.mkdirSync(builDir, { recursive: true })
  }
}

const defaultPreActions = {
  build: (ctx) => {
    removeBuildDir(ctx)
  }
}

const defaultPostActions = {

}

/**
 * Entry point for invoking a project action
 *
 * @param {ProjectConfig} project - The project configuration
 * @param {string} actionName - The name of the action to invoke
 */
exports.invokeAction = function (project, actionName) {
  const ctx = project.context
  const action = project.actions[actionName]
  if (action == null) {
    return Promise.reject(new TypeError('Action ' + actionName + ' was not found in project config'))
  }

  actions.info(`Performing ${actionName}`)
  const preDefault = defaultPreActions[actionName]
  const preAction = project.actions[actionName].preRun
  const postDefault = defaultPostActions[actionName]
  const postAction = project.actions[actionName].postRun
  const runAction = project.actions[actionName].run
  const chain = []

  // Run early pre-action function
  if (preDefault) chain.push(e => Promise.resolve(preDefault(ctx)))

  // Ensure the build dir is correclty populated
  chain.push(e => Promise.resolve(ensureBuildDir(ctx)))
  chain.push(e => Promise.resolve(createAllActionFiles(ctx, project.actions[actionName])))

  // Start the action sequencing
  if (preAction) chain.push(e => Promise.resolve(preAction(ctx)))
  if (runAction) chain.push(e => Promise.resolve(runAction(ctx)))
  if (postAction) chain.push(e => Promise.resolve(postAction(ctx)))
  if (postDefault) chain.push(e => Promise.resolve(postDefault(ctx)))

  // We don't need the config dir after we are done
  chain.push(e => Promise.resolve(removeConfigDir(ctx)))

  return chain.reduce((promise, chain) => {
    return promise.then(chain)
  }, Promise.resolve(null))
}
