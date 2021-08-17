#! /usr/bin/env node
/* eslint-disable no-console */

const { cli } = require("eilos");
const { hideBin } = require("yargs/helpers");

cli(hideBin(process.argv));
