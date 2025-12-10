const { appendFileSync } = require("fs");
const { createCapRoverAPI, validateCapRoverEnv, waitFor } = require("./utils");

async function main() {
  const env = validateCapRoverEnv();
  const caprover = createCapRoverAPI(env.caproverPassword, env.caproverServer);

  // Use app name directly from environment
  const appName = env.caproverAppName;

  console.log(`Checking for app: ${appName}`);

  // Get all apps and check if our app exists
  let allAppDefs = await caprover.getAllApps();
  let appDef =
    allAppDefs.appDefinitions?.find((app) => app.appName === appName) || null;

  if (!appDef) {
    console.log(`App "${appName}" not found. Creating it...`);

    try {
      // Register the new app with default settings
      await caprover.registerNewApp(appName, "", false, false);
      console.log(`App "${appName}" created successfully.`);
      await waitFor(100);
      // Fetch app definition and enable deploy token
      console.log(`Enabling deploy token for app "${appName}"...`);
      const appsAfterCreate = await caprover.getAllApps();
      appDef =
        appsAfterCreate.appDefinitions?.find(
          (app) => app.appName === appName
        ) || null;

      if (!appDef) {
        throw new Error(`Failed to fetch newly created app "${appName}"`);
      }

      // Enable app deploy token
      appDef.appDeployTokenConfig = {
        enabled: true,
      };

      await caprover.updateConfigAndSave(appName, appDef);
      console.log(`Deploy token enabled for app "${appName}".`);
      await waitFor(100);

      allAppDefs = await caprover.getAllApps();
      appDef =
        allAppDefs.appDefinitions?.find((app) => app.appName === appName) ||
        null;
    } catch (error) {
      throw new Error(
        `Failed to create app "${appName}": ${
          error && error.message ? error.message : String(error)
        }`
      );
    }

    // Wait for the server to process the config update
    await waitFor(100);

    // Enable SSL for the base domain (if enabled)
    const enableSsl = process.env.ENABLE_SSL !== "false";
    if (enableSsl) {
      console.log(`Enabling SSL for app "${appName}"...`);
      try {
        await waitFor(100);
        await caprover.enableSslForBaseDomain(appName);
        console.log(`SSL enabled for app "${appName}".`);
      } catch (sslError) {
        console.warn(
          `Warning: Failed to enable SSL: ${
            sslError && sslError.message ? sslError.message : String(sslError)
          }`
        );
        console.log("Continuing without SSL...");
      }
    }
  }

  // Wait before fetching final app state
  await waitFor(100);

  if (!appDef) {
    throw new Error(`Could not find app "${appName}" after setup`);
  }

  const appToken = appDef.appDeployTokenConfig?.appDeployToken;
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

main().catch((err) => {
  console.error("Error during setup:", err);
  process.exit(1);
});
