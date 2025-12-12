import { appendFileSync } from "fs";
import * as caprover from "./caprover.ts";
import type { IAppDef } from "./models/AppDefinition.ts";
import { parseConfig, validateCapRoverEnv } from "./utils.ts";

export async function setupCaproverApp(): Promise<void> {
  const env = validateCapRoverEnv();
  const { token } = await caprover.login(
    env.caproverServer,
    env.caproverPassword
  );
  // Use app name directly from environment
  const appName = env.caproverAppName;

  console.log(`Checking for app: ${appName}`);

  // Get all apps and check if our app exists
  let allAppDefs = await caprover.getAllApps(env.caproverServer, token);
  let appDef: IAppDef | null =
    allAppDefs.appDefinitions?.find((app) => app.appName === appName) || null;

  if (!appDef) {
    console.log(`App "${appName}" not found. Creating it...`);

    try {
      // Register the new app with settings from environment
      const hasPersistentData = process.env.HAS_PERSISTENT_DATA === "true";
      await caprover.registerNewApp(
        env.caproverServer,
        token,
        appName,
        "",
        hasPersistentData
      );
      console.log(`App "${appName}" created successfully.`);

      // Fetch app definition
      const appsAfterCreate = await caprover.getAllApps(
        env.caproverServer,
        token
      );
      appDef =
        appsAfterCreate.appDefinitions?.find(
          (app) => app.appName === appName
        ) || null;

      if (!appDef) {
        throw new Error(`Failed to fetch newly created app "${appName}"`);
      }
    } catch (error) {
      throw new Error(`Failed to create app "${appName}"`, {
        cause: error,
      });
    }
  }

  if (!appDef) {
    throw new Error(`Could not find app "${appName}" after setup`);
  }

  // Enable SSL for the base domain (if enabled)
  const enableSsl = process.env.ENABLE_SSL !== "false";
  if (enableSsl && !appDef.hasDefaultSubDomainSsl) {
    console.log(`Enabling SSL for app "${appName}"...`);
    try {
      await caprover.enableSslForBaseDomain(env.caproverServer, token, appName);
      console.log(`SSL enabled for app "${appName}".`);
    } catch (sslError) {
      console.warn(
        `Warning: Failed to enable SSL: ${
          sslError instanceof Error ? sslError.message : String(sslError)
        }`
      );
      console.log("Continuing without SSL...");
    }
  }

  // Accumulate all configuration changes
  let hasChanges = false;

  // Enable app deploy token
  if (!appDef.appDeployTokenConfig?.enabled) {
    appDef.appDeployTokenConfig = {
      enabled: true,
    };
    hasChanges = true;
  }

  // Apply custom config if provided
  const configJson = process.env.CONFIG;
  if (configJson) {
    try {
      const customConfig = parseConfig(configJson);
      Object.assign(appDef, customConfig);
      hasChanges = true;
    } catch (error) {
      throw new Error(`Failed to parse config`, {
        cause: error,
      });
    }
  }

  // Save all changes at once
  if (hasChanges) {
    console.log(`Updating app "${appName}"...`);
    await caprover.updateConfigAndSave(
      env.caproverServer,
      token,
      appName,
      appDef
    );
  }

  // Fetch final app state to ensure all changes are applied
  allAppDefs = await caprover.getAllApps(env.caproverServer, token);
  appDef =
    allAppDefs.appDefinitions?.find((app) => app.appName === appName) || null;

  const appToken = appDef?.appDeployTokenConfig?.appDeployToken;
  if (!appToken) {
    throw new Error(`No deploy token found for app "${appName}"`);
  }

  console.log(`App "${appName}" is ready with deploy token.`);

  // Set outputs using GitHub Actions environment file
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    appendFileSync(outputFile, `app-token=${appToken}\n`);
  }
}
