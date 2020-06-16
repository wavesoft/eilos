const fs = require('fs')
const rimraf = require('rimraf')

const actions = require('./logger').child({ component: 'files' })
const { createAllActionFiles } = require('./files')

function removeBuildDir (ctx) {
  const builDir = ctx.getDirectory('dist')
  actions.debug(`Removing ${builDir}`)
  rimraf.sync(builDir)
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
    throw new TypeError('Action ' + actionName + ' was not found in project config')
  }

  actions.info(`Performing ${actionName}`)
  const preDefault = defaultPreActions[actionName]
  const preAction = project.actions[actionName].preRun
  const postDefault = defaultPostActions[actionName]
  const postAction = project.actions[actionName].postRun
  const runAction = project.actions[actionName].run

  // Run early pre-action function
  if (preDefault) preDefault(ctx)

  // Ensure the build dir is correclty populated
  ensureBuildDir(ctx)
  createAllActionFiles(ctx, project.actions[actionName])

  // Start the action sequencing
  if (preAction) preAction(ctx)
  if (runAction) runAction(ctx)
  if (postAction) postAction(ctx)
  if (postDefault) postDefault(ctx)
}
