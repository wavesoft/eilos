'use strict'

const merge = require('merge-options')
const path = require('path')
const execa = require('execa')

class Context {
  constructor () {
    this.util = {
      merge
    }
    this._env = {}
    this._dir = {}
    this._config = {}
    this._config_files = {}
  }

  isDevelop () {
    this.getNode() === 'development'
  }

  isProduction () {
    this.getNode() === 'production'
  }

  getMode () {
    return this._env.NODE_ENV || 'development'
  }

  setDirectory (name, path) {
    this._dir[name] = path
    return this
  }

  updateConfig (obj) {
    this._config = merge(this._config, obj)
  }

  getConfig (name, defaults = null) {
    const value = this._config[name]
    if (typeof value === 'object' && !Array.isArray(value)) {
      return merge({}, defaults || {}, value || {})
    } else {
      return value || defaults
    }
  }

  getConfigFilePath (name) {
    if (this._config_files[name] == null) {
      this._config_files[name] = null
    }
    return path.join(this.getDirectory('dist.config'), name)
  }

  addConfigFile (name, contents) {
    this._config_files[name] = contents
  }

  getDirectory (name) {
    if (this._dir[name] == null) {
      throw new Error(`Directory "${name}" was not defined`)
    }
    return this._dir[name]
  }

  exec (binary, args = [], options = {}) {
    return execa(binary, args, merge({
      localDir: this.getDirectory('project'),
      preferLocal: true,
      stdio: 'inherit',
      env: this._env
    }, options))
  }
}

function defaultContextForProject (projectPath) {
  const ctx = new Context()
  ctx._config = {}
  ctx._env = Object.assign(
    {
      NODE_ENV: 'development'
    },
    process.env
  )
  ctx._dir = {
    project: projectPath,
    dist: path.join(projectPath, 'dist'),
    static: path.join(projectPath, 'static'),
    'dist.config': path.join(projectPath, 'dist', '.config')
  }
  return ctx
}

function getProjectContext () {
  const context = defaultContextForProject(getBasePath())
  const config = getProjectConfig(context)
}

module.exports = {
  Context,
  defaultContextForProject
}
