#!/usr/bin/env node

import { startServer } from "./server";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

/**
 * Entry point for the XML Flatten CLI. Uses yargs to expose commands such as
 * `serve`, allowing operators to boot the HTTP server with optional flags.
 */
export const main = async () => {
  return yargs(hideBin(process.argv))
    .scriptName("xml-flatten")
    // `xml-flatten serve --port <n>` boots the backend locally.
    .command(
      "serve",
      "Start HTTP server for XML flattening service",
      (y: any) =>
        y
          .option("port", {
            type: "number",
            description: "Port where the API will listen",
            default: Number(process.env.PORT) || 3000,
          })
          .option("host", {
            type: "string",
            description: "Host where the API will listen",
            default: process.env.HOST || "localhost",
          }),
      async (args) => {
        await startServer(Number(args.port), args.host as string);
      }
    )
    .demandCommand(1)
    .help()
    .strict()
    .parse();
};

if (typeof require !== "undefined" && require.main === module) {
  void main();
}