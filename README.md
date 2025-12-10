# CapRover GitHub Action

A GitHub Action for setting up and cleaning up CapRover applications. Supports both preview deployments and production deployments with automatic SSL configuration.

## Features

- 🚀 **Setup** - Create or configure a CapRover application with deploy token
- 🧹 **Cleanup** - Delete CapRover applications (useful for PR preview cleanup)
- 🔒 **SSL Support** - Automatically enable SSL for applications (configurable)

## Inputs

### Common Inputs

| Input               | Description                                                | Required |
| ------------------- | ---------------------------------------------------------- | -------- |
| `command`           | Action to perform: `"setup"` or `"cleanup"`                | Yes      |
| `caprover-password` | CapRover admin password                                    | Yes      |
| `caprover-server`   | CapRover server URL (e.g., `https://caprover.example.com`) | Yes      |
| `caprover-app-name` | CapRover application name to setup or cleanup              | Yes      |
| `enable-ssl`        | Enable SSL for the app (setup only, default: `"true"`)     | No       |

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
    caprover-app-name: my-app

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
    caprover-app-name: my-app-preview-${{ github.head_ref }}
```

### Complete Example: PR Preview Deployments

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

      - name: Create tar file
        run: git ls-files | tar -czf deploy.tar -T -

      - name: Setup CapRover App
        id: caprover
        uses: etienne-dldc/caprover-github-action@v1
        with:
          command: "setup"
          caprover-password: ${{ secrets.CAPROVER_PASSWORD }}
          caprover-server: ${{ vars.CAPROVER_SERVER }}
          caprover-app-name: my-app-preview-${{ github.head_ref }}
          enable-ssl: "true"

      - name: Deploy to CapRover
        run: |
          caprover deploy \
            --caproverUrl ${{ vars.CAPROVER_SERVER }} \
            --caproverApp my-app-preview-${{ github.head_ref }} \
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
              body: '🚀 Preview deployed to: https://my-app-preview-${{ github.head_ref }}.example.com'
            })
```

### Complete Example: PR Cleanup

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
          caprover-app-name: my-app-preview-${{ github.head_ref }}
```

## Setup Instructions

### Prerequisites

1. A CapRover instance running and accessible
2. Admin credentials (password)
3. Repository secrets configured:
   - `CAPROVER_PASSWORD`: Your CapRover admin password
4. Repository variables configured:
   - `CAPROVER_SERVER`: Your CapRover server URL

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
5. Optionally enables SSL (if `enable-ssl` is `"true"`)
6. Outputs the deploy token for subsequent steps

### Cleanup Command

1. Validates CapRover environment variables
2. Finds the application by name
3. Deletes the application and all its volumes
4. Exits gracefully if application not found

## Troubleshooting

### SSL Enable Fails

SSL configuration failures are non-fatal and won't stop the deployment. The action will continue without SSL if it fails.

### App Not Found During Cleanup

If the application doesn't exist, cleanup exits gracefully without error.

### Missing Environment Variables

The action requires `CAPROVER_PASSWORD`, `CAPROVER_SERVER`, and `CAPROVER_APP_NAME`. All three must be provided.
