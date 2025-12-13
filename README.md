# CapRover GitHub Action

A GitHub Action for setting up and cleaning up CapRover applications. Supports both preview deployments and production deployments with automatic SSL configuration.

## Features

- 🚀 **Setup** - Create or configure a CapRover application with deploy token
- 🧹 **Cleanup** - Delete CapRover applications (useful for PR preview cleanup)
- 🔒 **SSL Support** - Automatically enable SSL for applications (configurable)

## Inputs

### Common Inputs

| Input                 | Description                                                                                   | Required |
| --------------------- | --------------------------------------------------------------------------------------------- | -------- |
| `command`             | Action to perform: `"setup"` or `"cleanup"`                                                   | ✅       |
| `caprover-password`   | CapRover admin password                                                                       | ✅       |
| `caprover-server`     | CapRover server URL (e.g., `https://caprover.example.com`)                                    | ✅       |
| `app-name`            | CapRover application name to setup or cleanup                                                 | ✅       |
| `enable-ssl`          | Enable SSL for the app (setup only, default: `"true"`)                                        | -        |
| `has-persistent-data` | Mark app as having persistent data (setup only, default: `"false"`)                           | -        |
| `app-config`          | Additional app configuration as JSON (setup only). Has higher priority than `app-config-path` | -        |
| `app-config-path`     | Path to a JSON file containing app configuration (setup only). Use for base config            | -        |
| `cleanup-storage`     | Delete storage volumes when cleaning up the app (cleanup only, default: `"true"`)             | -        |

### ⚠️ App Name Constraints

The `app-name` input has the following constraints:

- **Characters**: Only lowercase alphanumeric characters and dashes (`a-z`, `0-9`, `-`)
- **Length**: Cannot be too long (CapRover has internal limits on app name length)
- **Format**: Cannot start or end with a dash
- **Double dashes**: Cannot contain consecutive dashes (`--`)

#### PR Preview Recommendations

For PR preview deployments, it's **recommended to use the PR number** rather than the branch name to avoid issues with special characters and length:

```yaml
# ✅ Good - short and safe
app-name: preview-${{ github.event.pull_request.number }}

# ❌ Avoid - branch names may contain special characters that aren't allowed
app-name: preview-${{ github.head_ref }}
```

## Outputs

| Output      | Description                                                |
| ----------- | ---------------------------------------------------------- |
| `app-token` | The CapRover deploy token for the app (setup command only) |

## Usage

### Setup Command

Create or configure a CapRover application:

```yaml
- name: Setup CapRover App
  id: caprover
  uses: etienne-dldc/caprover-github-action@v1
  with:
    command: "setup"
    caprover-password: ${{ secrets.CAPROVER_PASSWORD }}
    caprover-server: ${{ vars.CAPROVER_SERVER }}
    app-name: my-app

- name: Deploy with CapRover CLI
  run: |
    caprover deploy \
      --caproverUrl ${{ vars.CAPROVER_SERVER }} \
      --caproverApp my-app \
      --appToken ${{ steps.caprover.outputs.app-token }} \
      --tarFile deploy.tar
```

### Cleanup Command

Delete a CapRover application (useful for PR cleanup):

```yaml
- name: Cleanup CapRover App
  uses: etienne-dldc/caprover-github-action@v1
  with:
    command: "cleanup"
    caprover-password: ${{ secrets.CAPROVER_PASSWORD }}
    caprover-server: ${{ vars.CAPROVER_SERVER }}
    app-name: my-app-preview-${{ github.event.pull_request.number }}
```

### Complete Example: PR Preview Deployments

This example demonstrates deploying a preview app for each pull request. The app will be automatically created (or updated) on PR open/update.

```yaml
name: Deploy Preview

on:
  pull_request:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup CapRover App
        id: caprover
        uses: etienne-dldc/caprover-github-action@v1
        with:
          command: "setup"
          caprover-password: ${{ secrets.CAPROVER_PASSWORD }}
          caprover-server: ${{ vars.CAPROVER_SERVER }}
          app-name: my-app-preview-${{ github.event.pull_request.number }}
          enable-ssl: "true"

      - name: Create tar file
        run: git ls-files | tar -czf deploy.tar -T -

      - name: Deploy to CapRover
        run: |
          caprover deploy \
            --caproverUrl ${{ vars.CAPROVER_SERVER }} \
            --caproverApp my-app-preview-${{ github.event.pull_request.number }} \
            --appToken ${{ steps.caprover.outputs.app-token }} \
            --tarFile deploy.tar

      - name: Comment PR
        uses: actions/github-script@v7
        with:
          script: |
            github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: '🚀 Preview deployed to: https://my-app-preview-${{ github.event.pull_request.number }}.example.com'
            })
```

### Complete Example: PR Cleanup

This example demonstrates cleaning up the preview app when the pull request is closed.

```yaml
name: Cleanup Preview

on:
  pull_request:
    types: [closed]

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Cleanup CapRover App
        uses: etienne-dldc/caprover-github-action@v1
        with:
          command: "cleanup"
          caprover-password: ${{ secrets.CAPROVER_PASSWORD }}
          caprover-server: ${{ vars.CAPROVER_SERVER }}
          app-name: my-app-preview-${{ github.event.pull_request.number }}
```

## Setup Instructions

### Prerequisites

1. A CapRover instance running and accessible
2. Admin credentials (password)
3. Repository secrets configured:
   - `CAPROVER_PASSWORD`: Your CapRover admin password
4. Repository variables configured:
   - `CAPROVER_SERVER`: Your CapRover server URL

### Configuration Options

There are two ways to configure your CapRover application, and they can be used together:

1. **File-based configuration** (`app-config-path`) - Use a JSON file in your repository for base configuration
2. **Inline configuration** (`app-config`) - Pass configuration directly via JSON input, which has **higher priority**

This two-level approach is useful for:

- Defining base configuration in a committed JSON file
- Overriding specific values from GitHub secrets at deployment time
- Example: Base config defines app structure, inline config provides secrets

#### Configuration Priority

When both `app-config-path` and `app-config` are provided:

- **Base config** (from file) is loaded first
- **Inline config** (from input) is merged on top, **overriding any conflicting values**
- Special handling for arrays (envVars, volumes, ports): merged by key/port, not replaced

#### Example: Separating Base Config from Secrets

**File: `caprover-config.json`** (commit to repository)

```json
{
  "envVars": [
    {
      "key": "NODE_ENV",
      "value": "production"
    }
  ],
  "volumes": {
    "/data": "my-volume",
    "/logs": "/var/logs"
  },
  "ports": {
    "3000": 3000
  },
  "websocketSupport": true
}
```

**Workflow: Override with secrets**

```yaml
- uses: etienne-dldc/caprover-github-action@v1
  with:
    command: "setup"
    caprover-password: ${{ secrets.CAPROVER_PASSWORD }}
    caprover-server: ${{ vars.CAPROVER_SERVER }}
    app-name: my-app
    app-config-path: caprover-config.json
    app-config: |
      {
        "envVars": [
          {
            "key": "API_KEY",
            "value": "${{ secrets.API_KEY }}"
          },
          {
            "key": "DATABASE_PASSWORD",
            "value": "${{ secrets.DB_PASSWORD }}"
          }
        ]
      }
```

Result: Base config merged with secrets, where both envVars are included (merged by key).

#### Example: Inline Configuration

```yaml
- uses: etienne-dldc/caprover-github-action@v1
  with:
    command: "setup"
    caprover-password: ${{ secrets.CAPROVER_PASSWORD }}
    caprover-server: ${{ vars.CAPROVER_SERVER }}
    app-name: my-app
    app-config: |
      {
        "envVars": {
          "NODE_ENV": "production",
          "API_KEY": "${{ secrets.API_KEY }}"
        },
        "volumes": {
          "/data": "my-volume",
          "/logs": "/var/logs"
        },
        "ports": {
          "3000": 3000,
          "8000": 8001
        }
      }
```

#### Configuration Schema

The `config` object is validated against a schema and supports the following properties:

**Environment Variables** (`envVars` - optional):

Can be either an object or an array format:

```typescript
// Object format (simpler)
"envVars": {
  "NODE_ENV": "production",
  "API_KEY": "secret-value"
}

// Or array format
"envVars": [
  {
    key: "NODE_ENV",
    value: "production"
  },
]
```

Environment variable array format definition:

```ts
interface IAppEnvVar {
  key: string;
  value: string;
}
```

Both formats are automatically converted to the array format internally.

**Volumes** (`volumes` - optional):

Can be either an object or an array format:

```typescript
// Object format (simpler) - containerPath as key, hostPath or volumeName as value
"volumes": {
  "/data": "my-volume",           // uses volumeName (no leading /)
  "/logs": "/var/logs"            // uses hostPath (starts with /)
}

// Or array format
"volumes": [
  {
    containerPath: "/data",
    volumeName: "my-volume"
  },
  {
    containerPath: "/logs",
    hostPath: "/var/logs",
    mode: "ro"
  }
]
```

Volume array format definition:

```ts
interface IAppVolume {
  containerPath: string;
  volumeName?: string; // optional - named volume to use
  hostPath?: string; // optional - host path for bind mounts
  mode?: string; // optional - e.g., "ro" for read-only
}
```

Both formats are automatically converted to the array format internally. In object format, if the value starts with `/`, it's treated as a host path, otherwise as a volume name.

**Ports** (`ports` - optional):

Can be either an object or an array format:

```typescript
// Object format (simpler) - containerPort as key, hostPort as value
"ports": {
  "3000": 3000,       // containerPort 3000 maps to hostPort 3000
  "8000": 8001        // containerPort 8000 maps to hostPort 8001
}

// Or array format
"ports": [
  {
    containerPort: 3000,
    hostPort: 3000,
    protocol: "tcp"
  },
  {
    containerPort: 8000,
    hostPort: 8001,
    protocol: "udp",
    publishMode: "host"
  }
]
```

Port array format definition:

```ts
interface IAppPort {
  containerPort: number; // required
  hostPort: number; // required
  protocol?: "udp" | "tcp"; // optional - default: "tcp"
  publishMode?: "ingress" | "host"; // optional
}
```

Both formats are automatically converted to the array format internally. Use array format if you need to specify protocol or publishMode.

**Other Optional Properties:**

- `description?: string` - App description
- `forceSsl?: boolean` - Force SSL for the app
- `websocketSupport?: boolean` - Enable WebSocket support
- `instanceCount?: number` - Number of app instances
- `containerHttpPort?: number` - HTTP port in container
- `redirectDomain?: string` - Redirect domain
- `customNginxConfig?: string` - Custom Nginx configuration

All properties are validated for correct types and formats. Invalid configurations will result in an error.

### In GitHub Repository

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add `CAPROVER_PASSWORD` as a secret
3. Add `CAPROVER_SERVER` as a variable
4. Create your workflow files in `.github/workflows/`

## How It Works

### Setup Command

1. Validates CapRover environment variables
2. Checks if the application already exists
3. Creates the application if it doesn't exist
4. Enables the deploy token for the application
5. Merges custom configuration if provided
6. Optionally enables SSL (if `enable-ssl` is `"true"`)
7. Outputs the deploy token for subsequent steps

### Cleanup Command

1. Validates CapRover environment variables
2. Finds the application by name
3. Deletes the application and all its volumes
4. Exits gracefully if application not found

## Troubleshooting

### SSL Enable Fails

SSL configuration failures are non-fatal and won't stop the deployment. The action will continue without SSL if it fails.

You can log into your CapRover dashboard to manually enable SSL yourself or try to re-run the action.

### App Not Found During Cleanup

If the application doesn't exist, cleanup exits gracefully without error.
