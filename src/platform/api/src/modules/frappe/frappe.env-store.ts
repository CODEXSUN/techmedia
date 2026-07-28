import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, parse } from "node:path";
import { AppError } from "@codexsun/framework/errors";

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
  if (!path) {
    throw new AppError({
      code: "FRAPPE_SETTINGS_FILE_MISSING",
      message: "The TechMedia .env file could not be found.",
      statusCode: 500
    });
  }
  try {
    const current = await readFile(path, "utf8");
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
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError({
      code: "FRAPPE_SETTINGS_SAVE_FAILED",
      message: "The Frappe settings could not be saved to the TechMedia .env file.",
      statusCode: 500
    });
  }
}

function nearestEnvironmentFile() {
  let current = process.cwd();
  while (true) {
    const candidate = join(current, ".env");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(current);
    if (parent === current || current === parse(current).root) return null;
    current = parent;
  }
}

function environmentLine(key: string, value: string) {
  if (/[\r\n]/u.test(value)) {
    throw AppError.validation(`${key} must not contain line breaks.`);
  }
  return value ? `${key}=${JSON.stringify(value)}` : `${key}=`;
}
