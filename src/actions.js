'use strict'

const util = require('util')
const rimraf = util.promisify(require('rimraf'))
const fs = require('fs')
const fsExists = util.promisify(fs.exists)
const fsMkdir = util.promisify(fs.mkdir)

const logger = require('./logger').child({ component: 'actions' })
const { createAllActionFiles } = require('./files')

function removeBuildDir (ctx) {
  const buildDir = ctx.getDirectory('dist')
  logger.debug(`Removing ${buildDir}`)
  return rimraf(buildDir)
}

function removeConfigDir (ctx) {
  const configDir = ctx.getDirectory('dist.config')
  logger.debug(`Removing ${configDir}`)
  return rimraf(configDir)
}

function ensureBuildDir (ctx) {
  const buildDir = ctx.getDirectory('dist')
  return fsExists(buildDir).then(ok => {
    if (!ok) {
      logger.debug(`Creating ${buildDir}`)
      return fsMkdir(buildDir, { recursive: true })
    }
    return true
  })
}

const defaultPreActions = {
  build: (ctx) => {
    return removeBuildDir(ctx)
  }
}

const defaultPostActions = {

}

/**
 * Entry point for invoking a project action
 *
 * @param {ProjectConfig} project - The project configuration
 * @param {string} actionName - The name of the action to invoke
 * @returns {Promise} - Returns a promise that will be resolved when the steps are completed
 */
exports.invokeAction = function (project, actionName) {
  const ctx = project.context
  const action = project.actions[actionName]
  if (action == null) {
    return Promise.reject(new TypeError('Action ' + actionName + ' was not found in project config'))
  }

  logger.info(`Performing ${actionName}`)
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
  chain.push(e => createAllActionFiles(ctx, project.actions[actionName]))

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
