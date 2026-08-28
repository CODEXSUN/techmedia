#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { createHash } from "node:crypto";
import { platform } from "node:os";

const root = resolve(import.meta.dirname, "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const mandatory = args.has("--mandatory");
const version = readVersion();
const versionCode = readVersionCode();
const apkName = `TechMedia-${version}.apk`;
const releaseDirectory = join(root, "storage", "mobile", "release");
const apkPath = join(releaseDirectory, apkName);
const manifestPath = join(releaseDirectory, "latest.json");
const notesPath = join(releaseDirectory, "release-notes.md");

if (![...args].every((arg) => ["--dry-run", "--mandatory"].includes(arg))) {
  fail("Usage: npm run mobile:release -- [--dry-run] [--mandatory]");
}
if (!process.env.VITE_MOBILE_API_URL?.trim()) {
  fail("VITE_MOBILE_API_URL is required to prepare a mobile release.");
}

if (!dryRun) buildRelease();
prepareReleaseFiles();
printSummary();

function buildRelease() {
  if (platform() === "win32") run("cmd.exe", ["/d", "/s", "/c", "npm.cmd run mobile:apk:release"]);
  else run("npm", ["run", "mobile:apk:release"]);
}

function prepareReleaseFiles() {
  const sourceApk = join(
    root,
    "src",
    "mobile",
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    "release",
    "app-release.apk"
  );
  if (!existsSync(sourceApk)) {
    fail("No signed release APK exists. Run mobile:apk:release before a dry run.");
  }
  assertApkVersion();
  mkdirSync(releaseDirectory, { recursive: true });
  const apk = readFileSync(sourceApk);
  writeFileSync(apkPath, apk);

  const manifest = {
    apkUrl: `${process.env.VITE_MOBILE_API_URL.replace(/\/$/u, "")}/mobile/release/${apkName}`,
    mandatory,
    sha256: createHash("sha256").update(apk).digest("hex"),
    versionCode,
    versionName: version
  };
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  writeFileSync(notesPath, releaseNotes(), "utf8");
}

function assertApkVersion() {
  const metadataPath = join(
    root,
    "src",
    "mobile",
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    "release",
    "output-metadata.json"
  );
  if (!existsSync(metadataPath)) fail("The APK metadata file is missing.");
  const metadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  const element = metadata.elements?.[0];
  if (element?.versionCode !== versionCode || element?.versionName !== version) {
    fail("The signed APK version does not match package.json. Build the current mobile release first.");
  }
}

function readVersion() {
  const value = JSON.parse(readFileSync(join(root, "package.json"), "utf8")).version;
  if (typeof value !== "string" || !/^\d+\.\d+\.\d+$/u.test(value)) fail("Invalid package version.");
  return value;
}

function readVersionCode() {
  const source = readFileSync(join(root, "src", "mobile", "android", "app", "build.gradle"), "utf8");
  const match = source.match(/versionCode\s+(\d+)/u);
  if (!match?.[1]) fail("Android versionCode is missing.");
  return Number(match[1]);
}

function releaseNotes() {
  const source = readFileSync(join(root, "assist", "documentation", "CHANGELOG.md"), "utf8");
  const heading = `## v-${version}`;
  const start = source.indexOf(heading);
  if (start < 0) fail(`The changelog does not contain ${heading}.`);
  const end = source.indexOf("\n## v-", start + heading.length);
  return `${source.slice(start, end < 0 ? source.length : end).trim()}\n`;
}

function printSummary() {
  console.log(`Mobile storage release ${version}`);
  console.log(`APK: ${apkPath}`);
  console.log(`Manifest: ${manifestPath}`);
  console.log(`Mode: ${dryRun ? "dry run" : "prepared"}`);
}

function run(command, commandArgs) {
  execFileSync(command, commandArgs, { cwd: root, stdio: "inherit" });
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
