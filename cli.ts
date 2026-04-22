#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { startServer } from './backend/src/index.js';

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('port', {
      alias: 'p',
      type: 'number',
      description: 'Port for the web server',
      default: Number(process.env.PORT) || 3000,
    })
    .option('frontend', {
      alias: 'f',
      type: 'boolean',
      description: 'Enable the administration frontend',
      default: process.env.ENABLE_FRONTEND === 'true',
    })
    .option('frontend-path', {
      type: 'string',
      description: 'Path to frontend build (env: FRONTEND_PATH)',
      default: process.env.FRONTEND_PATH,
    })
    .command(
      'server',
      'Start the web server',
      () => {},
      async (argv) => {
        if (argv.frontendPath) {
          process.env.FRONTEND_PATH = argv.frontendPath as string;
        }
        await startServer(argv.port as number, argv.frontend as boolean);
      }
    )
    .help()
    .alias('help', 'h')
    .parse();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});