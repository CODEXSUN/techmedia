import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const ignoredDirectories = new Set([
  ".git",
  ".archive",
  "build",
  "dist",
  "dist-types",
  "node_modules"
]);
const mojibakePattern =
  /(?:\u00e2[^\x00-\x7f]|\u00c3.|\u00c2.|\u00ef\u00bb\u00bf|\u00f0\u0178|\uFFFD)/u;
const isEnvironmentFile = (name) =>
  /^\.env(?:\..+)?$/u.test(name) || /\.env\.(?:example|template)$/u.test(name);
async function findEnvironmentFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignoredDirectories.has(entry.name))
        files.push(...(await findEnvironmentFiles(path.join(directory, entry.name))));
    } else if (entry.isFile() && isEnvironmentFile(entry.name))
      files.push(path.join(directory, entry.name));
  }
  return files;
}
const failures = [];
const files = await findEnvironmentFiles(root);
const decoder = new TextDecoder("utf-8", { fatal: true });
for (const file of files) {
  const relativeFile = path.relative(root, file);
  let text;
  try {
    text = decoder.decode(await readFile(file));
  } catch {
    failures.push(`${relativeFile}: invalid UTF-8`);
    continue;
  }
  if (text.charCodeAt(0) === 0xfeff) failures.push(`${relativeFile}: UTF-8 BOM is not allowed`);
  text.split(/\r?\n/u).forEach((line, index) => {
    if (mojibakePattern.test(line))
      failures.push(`${relativeFile}:${index + 1}: possible mojibake`);
    if (/^\s*#/u.test(line) && /[^\t\x20-\x7e]/u.test(line))
      failures.push(`${relativeFile}:${index + 1}: comments must use ASCII text`);
  });
}
if (failures.length > 0) {
  console.error("Environment encoding check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Environment encoding check passed (${files.length} files).`);
