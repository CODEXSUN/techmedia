import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, parse, resolve } from "node:path";
import { AppError } from "@codexsun/framework/errors";
import { env } from "../../env.js";

const writableKeys = [
  "FRAPPE_APP_KEY",
  "FRAPPE_APP_SECRET",
  "FRAPPE_BASE_URL",
  "FRAPPE_CONNECTION_NAME",
  "FRAPPE_ENABLED",
  "FRAPPE_LAST_CHECKED_AT",
  "FRAPPE_LAST_VERIFIED_AT",
  "FRAPPE_UPDATED_AT",
  "FRAPPE_VERIFICATION_STATUS"
] as const;

export type FrappeEnvironmentUpdate = Partial<Record<(typeof writableKeys)[number], string>>;

let writeQueue = Promise.resolve();

export function updateFrappeEnvironment(values: FrappeEnvironmentUpdate) {
  const operation = writeQueue.then(() => writeEnvironment(values));
  writeQueue = operation.catch(() => undefined);
  return operation;
}

async function writeEnvironment(values: FrappeEnvironmentUpdate) {
  const path = nearestEnvironmentFile();
  try {
    const current = await readEnvironmentFile(path);
    const lineEnding = current.includes("\r\n") ? "\r\n" : "\n";
    const pending = new Map(Object.entries(values));
    const lines = current.split(/\r?\n/u).map((line) => {
      const key = writableKeys.find((candidate) => line.startsWith(`${candidate}=`));
      if (!key || !pending.has(key)) return line;
      const value = pending.get(key) ?? "";
      pending.delete(key);
      return environmentLine(key, value);
    });
    if (lines.at(-1) === "") lines.pop();
    for (const [key, value] of pending) lines.push(environmentLine(key, value));
    await writeFile(path, `${lines.join(lineEnding)}${lineEnding}`, {
      encoding: "utf8",
      mode: 0o600
    });
    Object.assign(env, values);
    Object.assign(process.env, values);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError({
      code: "FRAPPE_SETTINGS_SAVE_FAILED",
      message: saveErrorMessage(error),
      statusCode: 500
    });
  }
}

function nearestEnvironmentFile() {
  const configuredPath = env.TECHMEDIA_ENV_FILE_PATH.trim();
  if (configuredPath) {
    const candidate = isAbsolute(configuredPath)
      ? configuredPath
      : resolve(process.cwd(), configuredPath);
    return candidate;
  }

  let current = process.cwd();
  while (true) {
    const candidate = join(current, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current || current === parse(current).root) return join(process.cwd(), ".env");
    current = parent;
  }
}

async function readEnvironmentFile(path: string) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (!isMissingFile(error)) throw error;
    await mkdir(dirname(path), { recursive: true });
    const examplePath = join(dirname(path), ".env.example");
    try {
      return await readFile(examplePath, "utf8");
    } catch (exampleError) {
      if (isMissingFile(exampleError)) return "";
      throw exampleError;
    }
  }
}

function isMissingFile(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function saveErrorMessage(error: unknown) {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
  if (code === "EACCES" || code === "EPERM" || code === "EROFS") {
    return "The TechMedia .env file is not writable by the API process. Make the configured runtime .env file writable, then save again.";
  }
  return "The Frappe settings could not be saved to the TechMedia .env file.";
}

function environmentLine(key: string, value: string) {
  if (/[\r\n]/u.test(value)) {
    throw AppError.validation(`${key} must not contain line breaks.`);
  }
  return value ? `${key}=${JSON.stringify(value)}` : `${key}=`;
}
