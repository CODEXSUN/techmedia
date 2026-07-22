#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const repositories = ["framework", "ui", "core"];

for (const repository of repositories) {
  const directory = resolve(root, "..", repository);
  if (!existsSync(resolve(directory, "package.json"))) {
    console.error(`[install] missing sibling repository: ${directory}`);
    process.exit(1);
  }

  console.info(`[install] ${repository}`);
  runNpm(["install", "--no-audit", "--no-fund"], directory);
}

console.info("[install] TECHMEDIA sibling packages are ready.");

function runNpm(args, cwd) {
  const executable = process.env.npm_execpath ? process.execPath : "npm";
  const commandArgs = process.env.npm_execpath ? [process.env.npm_execpath, ...args] : args;
  const result = spawnSync(executable, commandArgs, { cwd, stdio: "inherit" });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (result.status !== 0) process.exit(result.status ?? 1);
}
