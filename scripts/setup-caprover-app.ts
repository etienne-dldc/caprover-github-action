import { appendFileSync } from "fs";
import type { IAppDef } from "./models/AppDefinition.ts";
import * as caprover from "./utils/caprover.ts";
import { configNeedsSaving } from "./utils/configNeedsSaving.ts";
import { loadConfigFromPath } from "./utils/loadConfigFromPath.ts";
import { mergeConfigs } from "./utils/mergeConfigs.ts";
import { parseConfig } from "./utils/parseConfig.ts";
import { validateCapRoverEnv } from "./utils/validateCapRoverEnv.ts";
import { withRetry } from "./utils/withRetry.ts";

export async function setupCaproverApp(): Promise<void> {
  const env = validateCapRoverEnv();
  const { token } = await withRetry(() =>
    caprover.login(env.caproverServer, env.caproverPassword)
  );
  // Use app name directly from environment
  const appName = env.caproverAppName;

  console.log(`Checking for app: ${appName}`);

  // Get all apps and check if our app exists
  let allAppDefs = await withRetry(() =>
    caprover.getAllApps(env.caproverServer, token)
  );
  let appDef: IAppDef | null =
    allAppDefs.appDefinitions?.find((app) => app.appName === appName) || null;

  if (!appDef) {
    console.log(`App "${appName}" not found. Creating it...`);

    try {
      // Register the new app with settings from environment
      const hasPersistentData = process.env.HAS_PERSISTENT_DATA === "true";
      await withRetry(() =>
        caprover.registerNewApp(
          env.caproverServer,
          token,
          appName,
          "",
          hasPersistentData
        )
      );
      console.log(`App "${appName}" created successfully.`);

      // Fetch app definition
      await withRetry(async () => {
        allAppDefs = await caprover.getAllApps(env.caproverServer, token);
        appDef =
          allAppDefs.appDefinitions?.find((app) => app.appName === appName) ||
          null;

        if (!appDef) {
          throw new Error(`Failed to fetch newly created app "${appName}"`);
        }
      });
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
      await withRetry(
        () =>
          caprover.enableSslForBaseDomain(env.caproverServer, token, appName),
        5,
        1000
      );
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

  let expectedAppDef: Partial<IAppDef> = {
    // Enable app deploy token
    appDeployTokenConfig: {
      ...appDef.appDeployTokenConfig,
      enabled: true,
    },
  };

  // Apply custom config from file path if provided
  const configPath = process.env.APP_CONFIG_PATH;
  if (configPath) {
    try {
      console.log(`Loading config from file: ${configPath}`);
      Object.assign(expectedAppDef, loadConfigFromPath(configPath));
    } catch (error) {
      throw new Error(`Failed to load config from path`, {
        cause: error,
      });
    }
  }

  // Apply custom config from JSON string if provided (has higher priority than file)
  const configJson = process.env.APP_CONFIG;
  if (configJson) {
    try {
      const customConfig = parseConfig(configJson);
      expectedAppDef = mergeConfigs(expectedAppDef, customConfig);
    } catch (error) {
      throw new Error(`Failed to parse config`, {
        cause: error,
      });
    }
  }

  // Apply merged config to app definition
  const needsSaving = configNeedsSaving(appDef, expectedAppDef);
  if (needsSaving) {
    const mergedConfig = Object.assign({}, appDef, expectedAppDef);
    console.log(`Updating app "${appName}"...`);
    await withRetry(() =>
      caprover.updateConfigAndSave(
        env.caproverServer,
        token,
        appName,
        mergedConfig
      )
    );
  }

  // Fetch final app state to ensure all changes are applied
  allAppDefs = await withRetry(() =>
    caprover.getAllApps(env.caproverServer, token)
  );
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
