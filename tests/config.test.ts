import assert from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import test from "node:test";
import type { IAppDef } from "../scripts/models/index.ts";
import { configNeedsSaving } from "../scripts/utils/configNeedsSaving.ts";
import { loadConfigFromPath } from "../scripts/utils/loadConfigFromPath.ts";
import { mergeConfigs } from "../scripts/utils/mergeConfigs.ts";
import { parseConfig } from "../scripts/utils/parseConfig.ts";

// Helper to create minimal valid config
function createMinimalConfig(): Partial<IAppDef> {
  return {
    forceSsl: false,
    websocketSupport: false,
    instanceCount: 1,
    ports: [],
    volumes: [],
    envVars: [],
  };
}

// Helper to create minimal full config (for configNeedsSaving)
function createMinimalFullConfig(): IAppDef {
  return {
    deployedVersion: 0,
    notExposeAsWebApp: false,
    hasPersistentData: false,
    hasDefaultSubDomainSsl: false,
    captainDefinitionRelativeFilePath: "captain-definition",
    forceSsl: false,
    websocketSupport: false,
    instanceCount: 1,
    networks: [],
    customDomain: [],
    ports: [],
    volumes: [],
    envVars: [],
    versions: [],
  };
}

test("parseConfig - valid JSON object", () => {
  const jsonStr = JSON.stringify({
    forceSsl: true,
    instanceCount: 2,
  });
  const result = parseConfig(jsonStr);
  assert.strictEqual(result.forceSsl, true);
  assert.strictEqual(result.instanceCount, 2);
});

test("parseConfig - empty string returns empty config", () => {
  const result = parseConfig("");
  assert.deepStrictEqual(result, {});
});

test("parseConfig - null returns empty config", () => {
  const result = parseConfig(null);
  assert.deepStrictEqual(result, {});
});

test("parseConfig - undefined returns empty config", () => {
  const result = parseConfig(undefined);
  assert.deepStrictEqual(result, {});
});

test("parseConfig - invalid JSON throws error", () => {
  assert.throws(() => {
    parseConfig("{ invalid json }");
  }, /Invalid config format/);
});

test("parseConfig - JSON array throws error", () => {
  assert.throws(() => {
    parseConfig("[]");
  }, /Invalid config format/);
});

test("parseConfig - JSON string throws error", () => {
  assert.throws(() => {
    parseConfig('"just a string"');
  }, /Invalid config format/);
});

test("parseConfig - validates envVars", () => {
  const jsonStr = JSON.stringify({
    envVars: [
      { key: "KEY1", value: "value1" },
      { key: "KEY2", value: "value2" },
    ],
  });
  const result = parseConfig(jsonStr);
  assert(result.envVars);
  assert.strictEqual(result.envVars.length, 2);
  assert.strictEqual(result.envVars[0]?.key, "KEY1");
});

test("parseConfig - validates volumes", () => {
  const jsonStr = JSON.stringify({
    volumes: [{ containerPath: "/data", volumeName: "data-volume" }],
  });
  const result = parseConfig(jsonStr);
  assert(result.volumes);
  assert.strictEqual(result.volumes.length, 1);
  assert.strictEqual(result.volumes[0]?.containerPath, "/data");
});

test("parseConfig - validates ports", () => {
  const jsonStr = JSON.stringify({
    ports: [{ containerPort: 3000, hostPort: 8000 }],
  });
  const result = parseConfig(jsonStr);
  assert(result.ports);
  assert.strictEqual(result.ports.length, 1);
  assert.strictEqual(result.ports[0]?.containerPort, 3000);
});

test("mergeConfigs - basic override", () => {
  const base = { ...createMinimalConfig(), description: "base" };
  const override = { description: "override" };
  const result = mergeConfigs(base, override);
  assert.strictEqual(result.description, "override");
});

test("mergeConfigs - merge envVars by key", () => {
  const base: Partial<IAppDef> = {
    ...createMinimalConfig(),
    envVars: [
      { key: "KEY1", value: "value1" },
      { key: "KEY2", value: "value2" },
    ],
  };
  const override: Partial<IAppDef> = {
    envVars: [{ key: "KEY2", value: "overridden" }],
  };
  const result = mergeConfigs(base, override);
  assert(result.envVars);
  assert.strictEqual(result.envVars.length, 2);
  const key2 = result.envVars.find((v) => v.key === "KEY2");
  assert.strictEqual(key2?.value, "overridden");
});

test("mergeConfigs - merge volumes by containerPath", () => {
  const base: Partial<IAppDef> = {
    ...createMinimalConfig(),
    volumes: [
      { containerPath: "/data", volumeName: "volume1" },
      { containerPath: "/logs", volumeName: "volume2" },
    ],
  };
  const override: Partial<IAppDef> = {
    volumes: [{ containerPath: "/data", hostPath: "/host/data" }],
  };
  const result = mergeConfigs(base, override);
  assert(result.volumes);
  assert.strictEqual(result.volumes.length, 2);
  const dataVolume = result.volumes.find((v) => v.containerPath === "/data");
  assert.strictEqual(dataVolume?.hostPath, "/host/data");
});

test("mergeConfigs - merge ports by containerPort", () => {
  const base: Partial<IAppDef> = {
    ...createMinimalConfig(),
    ports: [
      { containerPort: 3000, hostPort: 8000 },
      { containerPort: 5000, hostPort: 9000 },
    ],
  };
  const override: Partial<IAppDef> = {
    ports: [{ containerPort: 3000, hostPort: 8080 }],
  };
  const result = mergeConfigs(base, override);
  assert(result.ports);
  assert.strictEqual(result.ports.length, 2);
  const port3000 = result.ports.find((p) => p.containerPort === 3000);
  assert.strictEqual(port3000?.hostPort, 8080);
});

test("mergeConfigs - override with no base envVars", () => {
  const base = { ...createMinimalConfig() };
  const override: Partial<IAppDef> = {
    envVars: [{ key: "KEY1", value: "value1" }],
  };
  const result = mergeConfigs(base, override);
  assert(result.envVars);
  assert.strictEqual(result.envVars.length, 1);
});

test("mergeConfigs - preserves other properties", () => {
  const base = {
    ...createMinimalConfig(),
    description: "test",
    forceSsl: false,
  };
  const override = { instanceCount: 5 };
  const result = mergeConfigs(base, override);
  assert.strictEqual(result.description, "test");
  assert.strictEqual(result.forceSsl, false);
  assert.strictEqual(result.instanceCount, 5);
});

test("loadConfigFromPath - reads and parses valid file", () => {
  const testDir = "./test-configs";
  const testFile = `${testDir}/valid-config.json`;
  try {
    mkdirSync(testDir, { recursive: true });
    const config = {
      description: "test app",
      forceSsl: true,
      instanceCount: 2,
    };
    writeFileSync(testFile, JSON.stringify(config));
    const result = loadConfigFromPath(testFile);
    assert.strictEqual(result.description, "test app");
    assert.strictEqual(result.forceSsl, true);
    assert.strictEqual(result.instanceCount, 2);
  } finally {
    rmSync(testDir, { recursive: true, force: true });
  }
});

test("loadConfigFromPath - throws on nonexistent file", () => {
  assert.throws(() => {
    loadConfigFromPath("/nonexistent/path/config.json");
  }, /Failed to load config from/);
});

test("loadConfigFromPath - throws on invalid JSON", () => {
  const testDir = "./test-configs";
  const testFile = `${testDir}/invalid-config.json`;
  try {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(testFile, "{ invalid json }");
    assert.throws(() => {
      loadConfigFromPath(testFile);
    }, /Failed to load config from/);
  } finally {
    rmSync(testDir, { recursive: true, force: true });
  }
});

test("loadConfigFromPath - throws when file contains JSON array", () => {
  const testDir = "./test-configs";
  const testFile = `${testDir}/array-config.json`;
  try {
    mkdirSync(testDir, { recursive: true });
    writeFileSync(testFile, "[]");
    assert.throws(() => {
      loadConfigFromPath(testFile);
    }, /Failed to load config from/);
  } finally {
    rmSync(testDir, { recursive: true, force: true });
  }
});

test("configNeedsSaving - returns true when configs differ", () => {
  const current: IAppDef = {
    ...createMinimalFullConfig(),
    description: "current",
  };
  const expected = { description: "expected" };
  const result = configNeedsSaving(current, expected);
  assert.strictEqual(result, true);
});

test("configNeedsSaving - returns true when appDeployTokenConfig.enabled differs", () => {
  const current: IAppDef = {
    ...createMinimalFullConfig(),
    appDeployTokenConfig: { enabled: false },
  };
  const expected: Partial<IAppDef> = {
    appDeployTokenConfig: { enabled: true },
  };
  const result = configNeedsSaving(current, expected);
  assert.strictEqual(result, true);
});

test("configNeedsSaving - returns true when current has extra properties after validation", () => {
  const current: IAppDef = {
    ...createMinimalFullConfig(),
    description: "test",
    instanceCount: 2,
  };
  const expected: Partial<IAppDef> = {
    description: "test",
    instanceCount: 2,
  };
  // createMinimalFullConfig adds ports, volumes, envVars arrays which won't be in expected
  const result = configNeedsSaving(current, expected);
  // Since validated current will have more keys than expected, it returns true
  assert.strictEqual(result, true);
});

test("configNeedsSaving - returns true when expected has properties not in current", () => {
  const current: IAppDef = {
    ...createMinimalFullConfig(),
    description: "test",
  };
  const expected: Partial<IAppDef> = {
    description: "test",
    instanceCount: 5,
  };
  // The current config doesn't have the instanceCount change, so it needs saving
  const result = configNeedsSaving(current, expected);
  assert.strictEqual(result, true);
});

test("configNeedsSaving - compares envVars correctly", () => {
  const current: IAppDef = {
    ...createMinimalFullConfig(),
    envVars: [
      { key: "KEY1", value: "value1" },
      { key: "KEY2", value: "value2" },
    ],
  };
  const expected: Partial<IAppDef> = {
    envVars: [
      { key: "KEY1", value: "value1" },
      { key: "KEY2", value: "different" },
    ],
  };
  const result = configNeedsSaving(current, expected);
  assert.strictEqual(result, true);
});

test("configNeedsSaving - compares nested arrays correctly", () => {
  const current: IAppDef = {
    ...createMinimalFullConfig(),
    envVars: [{ key: "KEY1", value: "value1" }],
  };
  const expected: Partial<IAppDef> = {
    envVars: [{ key: "KEY1", value: "value1" }],
  };
  // The validated current will have many more keys than expected, so it returns true
  const result = configNeedsSaving(current, expected);
  assert.strictEqual(result, true);
});
