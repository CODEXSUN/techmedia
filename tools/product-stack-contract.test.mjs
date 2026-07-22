import assert from "node:assert/strict";
import test from "node:test";
import { matchesServiceHealthContract } from "./dev-stack-health.mjs";
import { affectedProductStacks, productStackContract } from "./product-stack-contract.mjs";

test("TechMedia packages compose into the single Platform runtime without sharing ownership", () => {
  assert.deepEqual(productStackContract.techmedia.formula, ["framework", "ui", "core", "platform"]);
  assert.deepEqual(productStackContract.techmedia.services, ["platform-api", "platform-web"]);
  assert.equal(productStackContract.techmedia.deploymentPolicy, "composed-platform-release");
});

test("stack impact keeps product-only changes inside their release boundary", () => {
  assert.deepEqual(affectedProductStacks(["src/platform/api/src/app.ts"]), ["techmedia"]);
  assert.deepEqual(affectedProductStacks(["src/platform/web/src/main.tsx"]), ["techmedia"]);
  assert.deepEqual(affectedProductStacks(["../core/api/src/app.ts"]), ["techmedia"]);
  assert.deepEqual(affectedProductStacks(["../framework/src/api/index.ts"]), ["techmedia"]);
  assert.deepEqual(affectedProductStacks(["tools/product-stack-contract.mjs"]), ["techmedia"]);
});

test("development attachment accepts only the expected healthy dependency", () => {
  const health = {
    data: { checks: { "platform-api": { status: "ok" } }, status: "ok" },
    success: true
  };
  assert.equal(matchesServiceHealthContract(health, "platform-api"), true);
  assert.equal(matchesServiceHealthContract(health, "core-api"), false);
  assert.equal(matchesServiceHealthContract({ ...health, success: false }, "platform-api"), false);
});
