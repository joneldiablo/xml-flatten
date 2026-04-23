#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import server from './backend/src/index';
import generate from './backend/src/tools/generate';

const { startServer } = server;
const { generateZip } = generate;

async function main() {
  const argv = await yargs(hideBin(process.argv))
    .option('port', {
      alias: 'p',
      type: 'number',
      description: 'Port for the web server (env: PORT)',
      default: Number(process.env.PORT) || 3000,
    })
    .option('frontend', {
      alias: 'f',
      type: 'boolean',
      description: 'Enable the administration frontend (env: ENABLE_FRONTEND)',
      default: process.env.ENABLE_FRONTEND === 'true',
    })
    .option('frontend-path', {
      type: 'string',
      description: 'Path to frontend build (env: FRONTEND_PATH)',
      default: process.env.FRONTEND_PATH,
    })
    .option('db-path', {
      type: 'string',
      description: 'Path to SQLite database file (env: DB_PATH)',
      default: process.env.DB_PATH,
    })
    .option('path-uuid', {
      type: 'string',
      description: 'JSON path to extract UUID from XML documents (env: PATH_UUID)',
      default: process.env.PATH_UUID,
    })
    .option('batch-size', {
      type: 'number',
      description: 'Batch size for ZIP upload processing (env: BATCH_SIZE)',
      default: Number(process.env.BATCH_SIZE) || 500,
    })
    .command(
      'server',
      'Start the web server',
      () => {},
      async (argv) => {
        if (argv.frontendPath) process.env.FRONTEND_PATH = argv.frontendPath as string;
        if (argv.dbPath) process.env.DB_PATH = argv.dbPath as string;
        if (argv.pathUuid) process.env.PATH_UUID = argv.pathUuid as string;
        if (argv.batchSize) process.env.BATCH_SIZE = String(argv.batchSize);

        await startServer({ port: argv.port, enableFrontend: argv.frontend });
      }
    )
    .command(
      'generate',
      'Generate fake CFDI invoices',
      (yargs) => yargs
        .option('count', {
          alias: 'n',
          type: 'number',
          description: 'Number of invoices to generate',
          default: 100,
        })
        .option('output', {
          alias: 'o',
          type: 'string',
          description: 'Output ZIP file path',
          default: './data/generated.zip',
        }),
      async (argv) => {
        const count = argv.count as number;
        const output = argv.output as string;
        console.log(`Generating ${count} invoices...`);
        await generateZip(count, output);
        console.log(`Done: ${output}`);
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