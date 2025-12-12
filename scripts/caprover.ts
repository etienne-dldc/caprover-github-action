import type { IAppDef } from "./models/AppDefinition.ts";
import type { AppDefinitionsResponse } from "./models/AppDefinitionsResponse.ts";

interface CapRoverResponse<T> {
  status: number;
  statusCode?: number;
  description?: string;
  data: T;
}

function validateResponse(data: CapRoverResponse<unknown>): void {
  // Status codes: 100 = OK, 101 = OK_PARTIALLY, 102 = OK_BUILD_STARTED
  if (
    data.status !== 100 &&
    data.status !== 101 &&
    data.status !== 102 &&
    data.status !== 200
  ) {
    if (data.status === 401 || data.status === 1001) {
      throw new Error("Authentication failed");
    }
    throw new Error(data.description || `API error: status ${data.status}`);
  }
}

async function performFetch<T>(
  baseUrl: string,
  token: string,
  method: "GET" | "POST",
  endpoint: string,
  variables: Record<string, unknown> = {}
): Promise<T> {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-namespace": "captain",
      "x-captain-auth": token,
    };
    let url = `${baseUrl}${endpoint}`;
    const options: Record<string, unknown> = {
      method,
      headers,
    };

    if (method === "GET") {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(variables)) {
        if (value !== undefined && value !== null) {
          params.append(key, String(value));
        }
      }
      const queryString = params.toString();
      if (queryString) {
        url += "?" + queryString;
      }
    } else if (method === "POST") {
      options.body = JSON.stringify(variables);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errBody}`);
    }

    const data = (await response.json()) as CapRoverResponse<T>;

    validateResponse(data);
    return data.data;
  } catch (error) {
    throw new Error(`API request failed`, {
      cause: error,
    });
  }
}

export interface LoginResponse {
  token: string;
}

export async function login(
  baseUrl: string,
  password: string,
  otpToken?: string
): Promise<LoginResponse> {
  try {
    const headers = {
      "Content-Type": "application/json",
      "x-namespace": "captain",
    };

    const response = await fetch(`${baseUrl}/api/v2/login`, {
      method: "POST",
      headers,
      body: JSON.stringify({ password, otpToken: otpToken || undefined }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errBody}`);
    }

    const data = (await response.json()) as CapRoverResponse<LoginResponse>;
    validateResponse(data);
    return data.data;
  } catch (error) {
    throw new Error(`Login failed`, {
      cause: error,
    });
  }
}

export async function getAllApps(
  baseUrl: string,
  token: string
): Promise<AppDefinitionsResponse> {
  return performFetch<AppDefinitionsResponse>(
    baseUrl,
    token,
    "GET",
    "/api/v2/user/apps/appDefinitions",
    {}
  );
}

export async function registerNewApp(
  baseUrl: string,
  token: string,
  appName: string,
  projectId: string,
  hasPersistentData: boolean
): Promise<unknown> {
  return performFetch(
    baseUrl,
    token,
    "POST",
    `/api/v2/user/apps/appDefinitions/register`,
    { appName, projectId: projectId ?? "", hasPersistentData }
  );
}

export async function enableSslForBaseDomain(
  baseUrl: string,
  token: string,
  appName: string
): Promise<unknown> {
  return performFetch(
    baseUrl,
    token,
    "POST",
    "/api/v2/user/apps/appDefinitions/enablebasedomainssl",
    { appName }
  );
}

export async function updateConfigAndSave(
  baseUrl: string,
  token: string,
  appName: string,
  appDefinition: IAppDef
): Promise<unknown> {
  return performFetch(
    baseUrl,
    token,
    "POST",
    "/api/v2/user/apps/appDefinitions/update",
    { ...appDefinition, appName, projectId: appDefinition.projectId ?? "" }
  );
}

export async function deleteApp(
  baseUrl: string,
  token: string,
  appName: string,
  volumes: unknown[],
  appNames?: string[]
): Promise<unknown> {
  return performFetch(
    baseUrl,
    token,
    "POST",
    "/api/v2/user/apps/appDefinitions/delete",
    { appName, volumes: volumes || [], appNames: appNames || undefined }
  );
}
