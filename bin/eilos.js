#! /usr/bin/env node
/* eslint-disable no-console */

const { getDefaultProjectConfig } = require('../src/config')
const { invokeAction } = require('../src/actions')

// const cli = require('yargs')
//
// cli
//   .scriptName('poseidon')
//   .env('POSEIDON')
//   .usage('Usage: $0 <command> [options]')
//   .example('$0 build', 'Runs the build command to bundle JS code for the browser.')
//   .example('npx $0 build', 'Can be used with `npx` to use a local version')
//   .example('$0 test -t webworker -- --browsers Firefox', 'If the command supports `--` can be used to forward options to the underlying tool.')
//   .example('npm test -- -- --browsers Firefox', 'If `npm test` translates to `aegir test -t browser` and you want to forward options you need to use `-- --` instead.')
//   .epilog('Use `$0 <command> --help` to learn more about each command.')
//   .commandDir('cmds')
//   .demandCommand(1, 'You need at least one command.')
//   .option('D', {
//     desc: 'Show debug output.',
//     type: 'boolean',
//     default: false,
//     alias: 'debug'
//   })
//   .help()
//   .alias('h', 'help')
//   .alias('v', 'version')
//   .group(['help', 'version', 'debug'], 'Global Options:')
//   .wrap(cli.terminalWidth())
//   .parserConfiguration({ 'populate--': true })
//   .recommendCommands()
//   .completion()
//   .strictCommands()

const config = getDefaultProjectConfig()
invokeAction(config, 'build')
