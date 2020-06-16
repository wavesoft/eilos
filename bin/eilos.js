#! /usr/bin/env node
/* eslint-disable no-console */

const cli = require('yargs')
const logger = require('../src/logger')
const { getDefaultProjectConfig } = require('../src/config')
const { invokeAction } = require('../src/actions')

const config = getDefaultProjectConfig()

// Expand the actions found in the profile
Object.keys(config.actions).reduce((cli, actionName) => {
  return cli.command({
    command: `${actionName} [options]`,
    desc: `Invoke the ${actionName} action`,
    handler: (argv) => {
      if (argv.debug) {
        logger.level = 'debug'
      }
      console.log(argv._)
      config.context.updateConfig({ argv: argv._.slice(1) })
      invokeAction(config, actionName)
    }
  })
}, cli
  .scriptName('eilos')
  .env('EILOS')
  .example('$0 build', 'Runs the build command to bundle JS code for the browser.')
  .usage('Usage: $0 <command> [options]')
  .demandCommand(1, 'You must specify the command to run.')
  .alias('h', 'help')
  .option('D', {
    desc: 'Show debug output.',
    type: 'boolean',
    default: false,
    alias: 'debug'
  })
  .wrap(cli.terminalWidth())
  .recommendCommands()
  .completion()
).argv
