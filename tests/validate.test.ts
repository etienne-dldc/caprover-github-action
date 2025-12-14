import assert from "node:assert";
import test from "node:test";
import {
  validateAppConfig,
  validateEnvVar,
  validatePort,
  validateVolume,
} from "../scripts/utils/validateAppConfig.ts";

// Test validateEnvVar
test("validateEnvVar - valid env var", () => {
  const result = validateEnvVar({ key: "TEST_KEY", value: "test_value" });
  assert.deepStrictEqual(result, { key: "TEST_KEY", value: "test_value" });
});

test("validateEnvVar - missing key returns null", () => {
  const result = validateEnvVar({ value: "test_value" });
  assert.strictEqual(result, null);
});

test("validateEnvVar - missing value returns null", () => {
  const result = validateEnvVar({ key: "TEST_KEY" });
  assert.strictEqual(result, null);
});

test("validateEnvVar - non-string key returns null", () => {
  const result = validateEnvVar({ key: 123, value: "test" });
  assert.strictEqual(result, null);
});

test("validateEnvVar - non-string value returns null", () => {
  const result = validateEnvVar({ key: "TEST", value: 123 });
  assert.strictEqual(result, null);
});

test("validateEnvVar - not an object returns null", () => {
  const result = validateEnvVar("not an object");
  assert.strictEqual(result, null);
});

test("validateEnvVar - null input returns null", () => {
  const result = validateEnvVar(null);
  assert.strictEqual(result, null);
});

// Test validateVolume
test("validateVolume - valid volume with volumeName", () => {
  const result = validateVolume({
    containerPath: "/data",
    volumeName: "my-volume",
  });
  assert.deepStrictEqual(result, {
    containerPath: "/data",
    volumeName: "my-volume",
  });
});

test("validateVolume - valid volume with hostPath", () => {
  const result = validateVolume({
    containerPath: "/data",
    hostPath: "/host/data",
  });
  assert.deepStrictEqual(result, {
    containerPath: "/data",
    hostPath: "/host/data",
  });
});

test("validateVolume - valid volume with mode", () => {
  const result = validateVolume({
    containerPath: "/data",
    volumeName: "my-volume",
    mode: "ro",
  });
  assert.deepStrictEqual(result, {
    containerPath: "/data",
    volumeName: "my-volume",
    mode: "ro",
  });
});

test("validateVolume - missing containerPath returns null", () => {
  const result = validateVolume({ volumeName: "my-volume" });
  assert.strictEqual(result, null);
});

test("validateVolume - non-string containerPath returns null", () => {
  const result = validateVolume({
    containerPath: 123,
    volumeName: "my-volume",
  });
  assert.strictEqual(result, null);
});

test("validateVolume - non-string volumeName is ignored", () => {
  const result = validateVolume({
    containerPath: "/data",
    volumeName: 123,
  });
  assert.deepStrictEqual(result, { containerPath: "/data" });
});

test("validateVolume - non-string hostPath is ignored", () => {
  const result = validateVolume({
    containerPath: "/data",
    hostPath: 123,
  });
  assert.deepStrictEqual(result, { containerPath: "/data" });
});

test("validateVolume - not an object returns null", () => {
  const result = validateVolume("not an object");
  assert.strictEqual(result, null);
});

// Test validatePort
test("validatePort - valid port tcp", () => {
  const result = validatePort({
    containerPort: 3000,
    hostPort: 8000,
    protocol: "tcp",
  });
  assert.deepStrictEqual(result, {
    containerPort: 3000,
    hostPort: 8000,
    protocol: "tcp",
  });
});

test("validatePort - valid port udp", () => {
  const result = validatePort({
    containerPort: 3000,
    hostPort: 8000,
    protocol: "udp",
  });
  assert.deepStrictEqual(result, {
    containerPort: 3000,
    hostPort: 8000,
    protocol: "udp",
  });
});

test("validatePort - valid port with publishMode ingress", () => {
  const result = validatePort({
    containerPort: 3000,
    hostPort: 8000,
    publishMode: "ingress",
  });
  assert.deepStrictEqual(result, {
    containerPort: 3000,
    hostPort: 8000,
    publishMode: "ingress",
  });
});

test("validatePort - valid port with publishMode host", () => {
  const result = validatePort({
    containerPort: 3000,
    hostPort: 8000,
    publishMode: "host",
  });
  assert.deepStrictEqual(result, {
    containerPort: 3000,
    hostPort: 8000,
    publishMode: "host",
  });
});

test("validatePort - missing containerPort returns null", () => {
  const result = validatePort({ hostPort: 8000 });
  assert.strictEqual(result, null);
});

test("validatePort - non-number containerPort returns null", () => {
  const result = validatePort({
    containerPort: "3000",
    hostPort: 8000,
  });
  assert.strictEqual(result, null);
});

test("validatePort - missing hostPort returns null", () => {
  const result = validatePort({ containerPort: 3000 });
  assert.strictEqual(result, null);
});

test("validatePort - non-number hostPort returns null", () => {
  const result = validatePort({
    containerPort: 3000,
    hostPort: "8000",
  });
  assert.strictEqual(result, null);
});

test("validatePort - invalid protocol is ignored", () => {
  const result = validatePort({
    containerPort: 3000,
    hostPort: 8000,
    protocol: "http",
  });
  assert.deepStrictEqual(result, { containerPort: 3000, hostPort: 8000 });
});

test("validatePort - invalid publishMode is ignored", () => {
  const result = validatePort({
    containerPort: 3000,
    hostPort: 8000,
    publishMode: "invalid",
  });
  assert.deepStrictEqual(result, { containerPort: 3000, hostPort: 8000 });
});

test("validatePort - not an object returns null", () => {
  const result = validatePort("not an object");
  assert.strictEqual(result, null);
});

// Test validateAppConfig
test("validateAppConfig - valid config with all properties", () => {
  const config = {
    description: "My App",
    forceSsl: true,
    websocketSupport: false,
    instanceCount: 2,
    containerHttpPort: 3000,
    redirectDomain: "example.com",
    customNginxConfig: "# Custom config",
    envVars: [{ key: "ENV_VAR", value: "value" }],
    volumes: [{ containerPath: "/data" }],
    ports: [{ containerPort: 3000, hostPort: 8000 }],
  };
  const result = validateAppConfig(config);
  assert.strictEqual(result.description, "My App");
  assert.strictEqual(result.forceSsl, true);
  assert.strictEqual(result.instanceCount, 2);
});

test("validateAppConfig - empty object returns empty config", () => {
  const result = validateAppConfig({});
  assert.deepStrictEqual(result, {});
});

test("validateAppConfig - null input returns empty config", () => {
  const result = validateAppConfig(null);
  assert.deepStrictEqual(result, {});
});

test("validateAppConfig - not an object returns empty config", () => {
  const result = validateAppConfig("not an object");
  assert.deepStrictEqual(result, {});
});

test("validateAppConfig - converts envVars from object to array", () => {
  const config = {
    envVars: {
      KEY1: "value1",
      KEY2: "value2",
    },
  };
  const result = validateAppConfig(config);
  assert(result.envVars);
  assert.strictEqual(result.envVars.length, 2);
  assert.strictEqual(result.envVars[0]?.key, "KEY1");
  assert.strictEqual(result.envVars[0]?.value, "value1");
});

test("validateAppConfig - converts volumes from object to array", () => {
  const config = {
    volumes: {
      "/data": "my-volume",
      "/logs": "/host/logs",
    },
  };
  const result = validateAppConfig(config);
  assert(result.volumes);
  assert.strictEqual(result.volumes.length, 2);
  const dataVolume = result.volumes.find((v) => v.containerPath === "/data");
  assert.strictEqual(dataVolume?.volumeName, "my-volume");
  const logsVolume = result.volumes.find((v) => v.containerPath === "/logs");
  assert.strictEqual(logsVolume?.hostPath, "/host/logs");
});

test("validateAppConfig - converts ports from object to array", () => {
  const config = {
    ports: {
      "3000": 8000,
      "5000": 9000,
    },
  };
  const result = validateAppConfig(config);
  assert(result.ports);
  assert.strictEqual(result.ports.length, 2);
  assert.strictEqual(result.ports[0]?.containerPort, 3000);
  assert.strictEqual(result.ports[0]?.hostPort, 8000);
});

test("validateAppConfig - filters invalid envVars", () => {
  const config = {
    envVars: [
      { key: "KEY1", value: "value1" },
      { key: 123, value: "invalid" },
      { key: "KEY2", value: "value2" },
    ],
  };
  const result = validateAppConfig(config);
  assert(result.envVars);
  assert.strictEqual(result.envVars.length, 2);
});

test("validateAppConfig - filters invalid volumes", () => {
  const config = {
    volumes: [
      { containerPath: "/data" },
      { volumeName: "invalid-no-path" },
      { containerPath: "/logs" },
    ],
  };
  const result = validateAppConfig(config);
  assert(result.volumes);
  assert.strictEqual(result.volumes.length, 2);
});

test("validateAppConfig - filters invalid ports", () => {
  const config = {
    ports: [
      { containerPort: 3000, hostPort: 8000 },
      { containerPort: "invalid", hostPort: 9000 },
      { containerPort: 5000, hostPort: 9000 },
    ],
  };
  const result = validateAppConfig(config);
  assert(result.ports);
  assert.strictEqual(result.ports.length, 2);
});

test("validateAppConfig - sorts envVars by key", () => {
  const config = {
    envVars: [
      { key: "ZEBRA", value: "z" },
      { key: "APPLE", value: "a" },
      { key: "BANANA", value: "b" },
    ],
  };
  const result = validateAppConfig(config);
  assert(result.envVars);
  assert.deepStrictEqual(result.envVars[0]?.key, "APPLE");
  assert.deepStrictEqual(result.envVars[1]?.key, "BANANA");
  assert.deepStrictEqual(result.envVars[2]?.key, "ZEBRA");
});

test("validateAppConfig - sorts volumes by containerPath", () => {
  const config = {
    volumes: [
      { containerPath: "/zebra" },
      { containerPath: "/apple" },
      { containerPath: "/banana" },
    ],
  };
  const result = validateAppConfig(config);
  assert(result.volumes);
  assert.strictEqual(result.volumes[0]?.containerPath, "/apple");
  assert.strictEqual(result.volumes[1]?.containerPath, "/banana");
  assert.strictEqual(result.volumes[2]?.containerPath, "/zebra");
});

test("validateAppConfig - sorts ports by containerPort", () => {
  const config = {
    ports: [
      { containerPort: 5000, hostPort: 9000 },
      { containerPort: 3000, hostPort: 8000 },
      { containerPort: 4000, hostPort: 8500 },
    ],
  };
  const result = validateAppConfig(config);
  assert(result.ports);
  assert.strictEqual(result.ports[0]?.containerPort, 3000);
  assert.strictEqual(result.ports[1]?.containerPort, 4000);
  assert.strictEqual(result.ports[2]?.containerPort, 5000);
});

test("validateAppConfig - validates description", () => {
  const config = { description: "Test description" };
  const result = validateAppConfig(config);
  assert.strictEqual(result.description, "Test description");
});

test("validateAppConfig - filters non-string description", () => {
  const config = { description: 123 };
  const result = validateAppConfig(config);
  assert.strictEqual(result.description, undefined);
});

test("validateAppConfig - validates forceSsl", () => {
  const config = { forceSsl: true };
  const result = validateAppConfig(config);
  assert.strictEqual(result.forceSsl, true);
});

test("validateAppConfig - filters non-boolean forceSsl", () => {
  const config = { forceSsl: "true" };
  const result = validateAppConfig(config);
  assert.strictEqual(result.forceSsl, undefined);
});

test("validateAppConfig - validates websocketSupport", () => {
  const config = { websocketSupport: true };
  const result = validateAppConfig(config);
  assert.strictEqual(result.websocketSupport, true);
});

test("validateAppConfig - validates instanceCount", () => {
  const config = { instanceCount: 5 };
  const result = validateAppConfig(config);
  assert.strictEqual(result.instanceCount, 5);
});

test("validateAppConfig - validates containerHttpPort", () => {
  const config = { containerHttpPort: 3000 };
  const result = validateAppConfig(config);
  assert.strictEqual(result.containerHttpPort, 3000);
});

test("validateAppConfig - validates redirectDomain", () => {
  const config = { redirectDomain: "example.com" };
  const result = validateAppConfig(config);
  assert.strictEqual(result.redirectDomain, "example.com");
});

test("validateAppConfig - validates customNginxConfig", () => {
  const config = { customNginxConfig: "# nginx config" };
  const result = validateAppConfig(config);
  assert.strictEqual(result.customNginxConfig, "# nginx config");
});

test("validateAppConfig - handles empty envVars array", () => {
  const config = { envVars: [] };
  const result = validateAppConfig(config);
  assert.strictEqual(result.envVars, undefined);
});

test("validateAppConfig - handles empty volumes array", () => {
  const config = { volumes: [] };
  const result = validateAppConfig(config);
  assert.strictEqual(result.volumes, undefined);
});

test("validateAppConfig - handles empty ports array", () => {
  const config = { ports: [] };
  const result = validateAppConfig(config);
  assert.strictEqual(result.ports, undefined);
});
