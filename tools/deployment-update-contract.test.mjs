import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function read(path) {
  return readFile(new URL(path, root), "utf8");
}

function envValues(source) {
  return Object.fromEntries(
    source
      .split(/\r?\n/u)
      .map((line) => line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/u))
      .filter(Boolean)
      .map((match) => [match[1], match[2]])
  );
}

test("deployment sample locks source, image, and migration compatibility versions", async () => {
  const packageJson = JSON.parse(await read("package.json"));
  const deployment = envValues(await read(".container/deploy.env.example"));

  assert.equal(deployment.TECHMEDIA_VERSION, packageJson.version);
  assert.equal(deployment.TECHMEDIA_IMAGE_TAG, packageJson.version);
  assert.equal(deployment.TECHMEDIA_MIGRATION_COMPATIBLE_VERSION, packageJson.version);
  assert.equal(deployment.TECHMEDIA_BACKUP_RETENTION, "10");
  assert.equal(deployment.TECHMEDIA_UPDATE_MIN_BACKUP_FREE_MB, "1024");
  assert.equal(deployment.TECHMEDIA_UPDATE_MIN_DOCKER_FREE_MB, "5120");
});

test("guarded updates retain reproducible and recoverable deployment evidence", async () => {
  const update = await read(".container/update.sh");

  assert.match(update, /flock -n 9/u);
  assert.match(update, /--allow-dirty/u);
  assert.match(update, /TECHMEDIA_MIGRATION_COMPATIBLE_VERSION/u);
  assert.match(update, /TECHMEDIA_UPDATE_MIN_DOCKER_FREE_MB/u);
  assert.match(update, /sha256sum --check/u);
  assert.match(update, /techmedia-deployment-\$timestamp\.json/u);
  assert.match(update, /sourceCommit/u);
  assert.match(update, /rolled-back/u);
});

test("setup initializes every guarded release setting from the repository version", async () => {
  const setup = await read(".container/setup.sh");

  assert.match(setup, /set_file_value "\$DEPLOY_ENV" TECHMEDIA_VERSION "\$version"/u);
  assert.match(setup, /set_file_value "\$DEPLOY_ENV" TECHMEDIA_IMAGE_TAG "\$version"/u);
  assert.match(
    setup,
    /set_file_value "\$DEPLOY_ENV" TECHMEDIA_MIGRATION_COMPATIBLE_VERSION "\$version"/u
  );
});

test("version bumps keep the public deployment release contract synchronized", async () => {
  const releaseTool = await read("tools/repository-release.mjs");

  assert.match(releaseTool, /updateDeploymentReleaseContract\(nextVersion\)/u);
  assert.match(releaseTool, /"TECHMEDIA_VERSION"/u);
  assert.match(releaseTool, /"TECHMEDIA_IMAGE_TAG"/u);
  assert.match(releaseTool, /"TECHMEDIA_MIGRATION_COMPATIBLE_VERSION"/u);
});
