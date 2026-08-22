import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const command = process.argv[2] ?? "run";
const sdkRoot = process.env.ANDROID_SDK_ROOT ?? join(homedir(), "AppData", "Local", "Android", "Sdk");
const adb = executable(sdkRoot, "platform-tools", "adb.exe");
const emulator = executable(sdkRoot, "emulator", "emulator.exe");
const nativeRoot = resolve("KMP-Mobile");
const appId = "in.techmedia.techme";
const avdName = process.env.TECHME_ANDROID_AVD ?? "TechMedia_API_36";

if (!existsSync(adb) || !existsSync(emulator)) {
  throw new Error("Android SDK tools were not found. Set ANDROID_SDK_ROOT to the Android SDK path.");
}

if (command === "emulator") {
  await startEmulator();
} else if (command === "build") {
  runGradle(":androidApp:assembleDebug");
} else if (command === "install") {
  await startEmulator();
  runGradle(":androidApp:installDebug");
} else if (command === "run") {
  await startEmulator();
  runGradle(":androidApp:installDebug");
  run(adb, ["shell", "am", "force-stop", appId]);
  run(adb, ["shell", "monkey", "-p", appId, "1"]);
} else {
  throw new Error("Use emulator, build, install, or run.");
}

async function startEmulator() {
  if (!deviceConnected()) {
    spawn(emulator, ["-avd", avdName], { detached: true, stdio: "ignore" }).unref();
  }
  run(adb, ["wait-for-device"]);
  await waitForBoot();
  console.log(`Android emulator ready: ${avdName}`);
}

async function waitForBoot() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (output(adb, ["shell", "getprop", "sys.boot_completed"]).trim() === "1") return;
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 1_000));
  }
  throw new Error("Android emulator did not finish booting within 60 seconds.");
}

function deviceConnected() {
  return output(adb, ["devices"]).split(/\r?\n/u).some((line) => /\tdevice$/u.test(line));
}

function runGradle(task) {
  run(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", `call gradlew.bat ${task} --console=plain --no-daemon --offline`], nativeRoot);
}

function output(commandPath, args) {
  const result = spawnSync(commandPath, args, { encoding: "utf8" });
  if (result.status !== 0) throw new Error(result.stderr || `Command failed: ${commandPath}`);
  return result.stdout;
}

function run(commandPath, args, cwd = process.cwd()) {
  const result = spawnSync(commandPath, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) throw new Error(`Command failed: ${commandPath}`);
}

function executable(...segments) {
  return join(...segments);
}
