#!/usr/bin/env node

import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const appRoot = join(root, "apps", "techmedia_flutter");
const command = process.argv[2];
const extraArgs = process.argv.slice(3);
const supported = new Set(["build-debug", "build-release", "release", "run"]);

if (!command || !supported.has(command)) {
  fail("Usage: node tools/flutter-mobile.mjs <run|build-debug|build-release|release> [Flutter options]");
}

if (command === "run") runFlutter(["run", ...extraArgs]);
if (command === "build-debug") buildApk("debug");
if (command === "build-release") buildApk("release");
if (command === "release") {
  buildApk("release");
  runNode([
    join(root, "tools", "publish-flutter-mobile-release.mjs"),
    "--base-url=https://app.techmedia.in/api/platform",
    ...(extraArgs.includes("--mandatory") ? ["--mandatory"] : [])
  ]);
}

function buildApk(mode) {
  const version = repositoryVersion();
  runFlutter([
    "build",
    "apk",
    `--${mode}`,
    `--dart-define=TECHMEDIA_APP_VERSION=${version}`
  ]);
  if (mode === "release") copyVersionedRelease(version);
}

function copyVersionedRelease(version) {
  const outputDirectory = join(appRoot, "build", "app", "outputs", "flutter-apk");
  const source = join(outputDirectory, "app-release.apk");
  const target = join(outputDirectory, `techmedia-v${version}.apk`);
  if (!existsSync(source)) fail(`Flutter release APK is missing: ${source}`);
  copyFileSync(source, target);
  console.log(`Versioned APK: ${target}`);
}

function runFlutter(args) {
  const executable = flutterExecutable();
  const result = platform() === "win32"
    ? spawnSync(process.env.ComSpec ?? "cmd.exe", ["/d", "/s", "/c", executable, ...args], {
        cwd: appRoot,
        stdio: "inherit"
      })
    : spawnSync(executable, args, { cwd: appRoot, stdio: "inherit" });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function runNode(args) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit" });
  if (result.error) fail(result.error.message);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function flutterExecutable() {
  if (process.env.FLUTTER_BIN?.trim()) return process.env.FLUTTER_BIN.trim();
  if (platform() === "win32") {
    const localFlutter = join(homedir(), "development", "flutter", "bin", "flutter.bat");
    if (existsSync(localFlutter)) return localFlutter;
    return "flutter.bat";
  }
  return "flutter";
}

function repositoryVersion() {
  const value = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/u.test(value)) fail("Invalid repository version.");
  return value;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
