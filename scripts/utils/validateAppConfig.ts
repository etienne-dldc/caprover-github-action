import type {
  IAppDef,
  IAppEnvVar,
  IAppPort,
  IAppVolume,
} from "../models/index.ts";

export function validateEnvVar(obj: unknown): IAppEnvVar | null {
  if (typeof obj !== "object" || obj === null) {
    console.warn("Invalid env var: expected object, got", typeof obj);
    return null;
  }

  const o = obj as Record<string, unknown>;
  const key = o.key;
  const value = o.value;

  if (typeof key !== "string") {
    console.warn("Invalid env var key: expected string, got", typeof key);
    return null;
  }
  if (typeof value !== "string") {
    console.warn("Invalid env var value: expected string, got", typeof value);
    return null;
  }

  return { key, value };
}

export function validateVolume(obj: unknown): IAppVolume | null {
  if (typeof obj !== "object" || obj === null) {
    console.warn("Invalid volume: expected object, got", typeof obj);
    return null;
  }

  const o = obj as Record<string, unknown>;
  const containerPath = o.containerPath;

  if (typeof containerPath !== "string") {
    console.warn(
      "Invalid volume containerPath: expected string, got",
      typeof containerPath
    );
    return null;
  }

  const result: IAppVolume = { containerPath };

  if (o.volumeName !== undefined && typeof o.volumeName === "string") {
    result.volumeName = o.volumeName;
  } else if (o.volumeName !== undefined) {
    console.warn(
      "Invalid volume volumeName: expected string, got",
      typeof o.volumeName
    );
  }

  if (o.hostPath !== undefined && typeof o.hostPath === "string") {
    result.hostPath = o.hostPath;
  } else if (o.hostPath !== undefined) {
    console.warn(
      "Invalid volume hostPath: expected string, got",
      typeof o.hostPath
    );
  }

  if (o.mode !== undefined && typeof o.mode === "string") {
    result.mode = o.mode;
  } else if (o.mode !== undefined) {
    console.warn("Invalid volume mode: expected string, got", typeof o.mode);
  }

  return result;
}

export function validatePort(obj: unknown): IAppPort | null {
  if (typeof obj !== "object" || obj === null) {
    console.warn("Invalid port: expected object, got", typeof obj);
    return null;
  }

  const o = obj as Record<string, unknown>;
  const containerPort = o.containerPort;
  const hostPort = o.hostPort;

  if (typeof containerPort !== "number") {
    console.warn(
      "Invalid port containerPort: expected number, got",
      typeof containerPort
    );
    return null;
  }
  if (typeof hostPort !== "number") {
    console.warn(
      "Invalid port hostPort: expected number, got",
      typeof hostPort
    );
    return null;
  }

  const result: IAppPort = { containerPort, hostPort };

  if (
    o.protocol !== undefined &&
    (o.protocol === "tcp" || o.protocol === "udp")
  ) {
    result.protocol = o.protocol;
  } else if (o.protocol !== undefined) {
    console.warn(
      'Invalid port protocol: expected "tcp" or "udp", got',
      o.protocol
    );
  }

  if (
    o.publishMode !== undefined &&
    (o.publishMode === "ingress" || o.publishMode === "host")
  ) {
    result.publishMode = o.publishMode;
  } else if (o.publishMode !== undefined) {
    console.warn(
      'Invalid port publishMode: expected "ingress" or "host", got',
      o.publishMode
    );
  }

  return result;
}

export function validateAppConfig(obj: unknown): Partial<IAppDef> {
  if (typeof obj !== "object" || obj === null) {
    console.warn("Invalid app config: expected object, got", typeof obj);
    return {};
  }

  const o = obj as Record<string, unknown>;
  const result: Partial<IAppDef> = {};

  // Validate and normalize volumes
  if (o.volumes !== undefined) {
    if (Array.isArray(o.volumes)) {
      const validated: IAppVolume[] = [];
      for (const item of o.volumes) {
        const valid = validateVolume(item);
        if (valid) {
          validated.push(valid);
        }
      }
      if (validated.length > 0) {
        // Sort by containerPath for predictable order
        result.volumes = validated.sort((a, b) =>
          a.containerPath.localeCompare(b.containerPath)
        );
      }
    } else if (typeof o.volumes === "object" && o.volumes !== null) {
      // Transform from object format to array format
      const volumesObj = o.volumes as Record<string, unknown>;
      const validated: IAppVolume[] = Object.entries(volumesObj).map(
        ([containerPath, pathOrVolume]) => {
          const volume: IAppVolume = { containerPath };
          if (String(pathOrVolume).startsWith("/")) {
            volume.hostPath = String(pathOrVolume);
          } else {
            volume.volumeName = String(pathOrVolume);
          }
          return volume;
        }
      );
      if (validated.length > 0) {
        // Sort by containerPath for predictable order
        result.volumes = validated.sort((a, b) =>
          a.containerPath.localeCompare(b.containerPath)
        );
      }
    } else {
      console.warn(
        "Invalid volumes: expected array or object, got",
        typeof o.volumes
      );
    }
  }

  // Validate and normalize ports
  if (o.ports !== undefined) {
    if (Array.isArray(o.ports)) {
      const validated: IAppPort[] = [];
      for (const item of o.ports) {
        const valid = validatePort(item);
        if (valid) {
          validated.push(valid);
        }
      }
      if (validated.length > 0) {
        // Sort by containerPort for predictable order
        result.ports = validated.sort(
          (a, b) => a.containerPort - b.containerPort
        );
      }
    } else if (typeof o.ports === "object" && o.ports !== null) {
      // Transform from object format to array format
      const portsObj = o.ports as Record<string, number>;
      const validated: IAppPort[] = Object.entries(portsObj).map(
        ([containerPort, hostPort]) => ({
          containerPort: Number(containerPort),
          hostPort: Number(hostPort),
        })
      );
      if (validated.length > 0) {
        // Sort by containerPort for predictable order
        result.ports = validated.sort(
          (a, b) => a.containerPort - b.containerPort
        );
      }
    } else {
      console.warn(
        "Invalid ports: expected array or object, got",
        typeof o.ports
      );
    }
  }

  // Validate and normalize envVars
  if (o.envVars !== undefined) {
    if (Array.isArray(o.envVars)) {
      const validated: IAppEnvVar[] = [];
      for (const item of o.envVars) {
        const valid = validateEnvVar(item);
        if (valid) {
          validated.push(valid);
        }
      }
      if (validated.length > 0) {
        // Sort by key for predictable order
        result.envVars = validated.sort((a, b) => a.key.localeCompare(b.key));
      }
    } else if (typeof o.envVars === "object" && o.envVars !== null) {
      // Transform from object format to array format
      const envVarsObj = o.envVars as Record<string, unknown>;
      const validated: IAppEnvVar[] = Object.entries(envVarsObj).map(
        ([key, value]) => ({
          key,
          value: String(value),
        })
      );
      if (validated.length > 0) {
        // Sort by key for predictable order
        result.envVars = validated.sort((a, b) => a.key.localeCompare(b.key));
      }
    } else {
      console.warn(
        "Invalid envVars: expected array or object, got",
        typeof o.envVars
      );
    }
  }

  // Validate description
  if (o.description !== undefined && typeof o.description === "string") {
    result.description = o.description;
  } else if (o.description !== undefined) {
    console.warn(
      "Invalid description: expected string, got",
      typeof o.description
    );
  }

  // Validate forceSsl
  if (o.forceSsl !== undefined && typeof o.forceSsl === "boolean") {
    result.forceSsl = o.forceSsl;
  } else if (o.forceSsl !== undefined) {
    console.warn("Invalid forceSsl: expected boolean, got", typeof o.forceSsl);
  }

  // Validate websocketSupport
  if (
    o.websocketSupport !== undefined &&
    typeof o.websocketSupport === "boolean"
  ) {
    result.websocketSupport = o.websocketSupport;
  } else if (o.websocketSupport !== undefined) {
    console.warn(
      "Invalid websocketSupport: expected boolean, got",
      typeof o.websocketSupport
    );
  }

  // Validate instanceCount
  if (o.instanceCount !== undefined && typeof o.instanceCount === "number") {
    result.instanceCount = o.instanceCount;
  } else if (o.instanceCount !== undefined) {
    console.warn(
      "Invalid instanceCount: expected number, got",
      typeof o.instanceCount
    );
  }

  // Validate containerHttpPort
  if (
    o.containerHttpPort !== undefined &&
    typeof o.containerHttpPort === "number"
  ) {
    result.containerHttpPort = o.containerHttpPort;
  } else if (o.containerHttpPort !== undefined) {
    console.warn(
      "Invalid containerHttpPort: expected number, got",
      typeof o.containerHttpPort
    );
  }

  // Validate redirectDomain
  if (o.redirectDomain !== undefined && typeof o.redirectDomain === "string") {
    result.redirectDomain = o.redirectDomain;
  } else if (o.redirectDomain !== undefined) {
    console.warn(
      "Invalid redirectDomain: expected string, got",
      typeof o.redirectDomain
    );
  }

  // Validate customNginxConfig
  if (
    o.customNginxConfig !== undefined &&
    typeof o.customNginxConfig === "string"
  ) {
    result.customNginxConfig = o.customNginxConfig;
  } else if (o.customNginxConfig !== undefined) {
    console.warn(
      "Invalid customNginxConfig: expected string, got",
      typeof o.customNginxConfig
    );
  }

  return result;
}
