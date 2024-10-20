# Probot Security Alert Watcher

This repository contains a sample GitHub App built with [Probot](https://github.com/probot/probot) that demonstrates how to monitor and respond to security alert events. The application automatically re-opens any security alert which is closed by someone that is not part of a specific team. It responds to alerts from code scanning, secret scanning, and Dependabot.

## Requirements

The repository contains a [development container](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers) that supports Visual Studio Code and GitHub Codespaces. This container includes all of the required dependencies. The application is written in TypeScript, runs on Node.js 22, and uses Yarn for package management. Opening the project in a development container will automatically install the required components and configure VS Code.   

> [!NOTE]
> To develop the project without a development container, [Node.js 22](https://nodejs.org/en/download/) must be installed. Running `yarn install` will install the required dependencies. Developing without the provided development container is **NOT RECOMMENDED** and will require additional configuration, including the settings and extensions listed in the [devcontainer.json](./.devcontainer/devcontainer.json).

The application expects a team called `scan-managers` to exist in your GitHub organization. This team contains the users that are approved to close code scanning alerts. If the team does not exist, all requests will be rejected. Alerts closed by users that are not part of this team will be automatically reopened. The name can be changed by configuring the environment variable `SECURITY_ALERT_CLOSE_TEAM`.

## License 

This project is licensed under the terms of the MIT open source license. Please refer to the [LICENSE](./LICENSE) for the full terms.

## Maintainers 

The current project maintainers can be found in [CODEOWNERS](./.github/CODEOWNERS).

## Node versions

The application and its development environment are currently tested and maintained using the upcoming LTS, Node 22.

Because Node 18 is no longer in Active Support, it is not recommended and is no longer supported. The original version of this project. That said, the code produced by `yarn run build` and `yarn run build:container` in `packages/server` *should* work when run using Node 18 and Node 20. Your mileage may vary.

## Setup and Local Development

Running the application requires a GitHub App to be registered. The process is automated, and running the application for the first time on a developer box will create a GitHub App and a local `.env` file with some required settings. 

The setup process will register the App to the current user's GitHub account by default. To create the GitHub App in an organization, create an initial `.env` file in `packages/server` which contains the following line:

```sh
GH_ORG=your-org-name
```

To launch the server application, run the following command:

```sh
yarn start
```

The `start` command starts a the server application locally and monitors for changes to the TypeScript files. Alternatively, open the [Run and Debug View](https://code.visualstudio.com/docs/editor/debugging) and choose the *Debug Probot Server* launch configuration. You can then press the start button or select the **Run** > **Run Without Debugging** menu option.

To configure the required settings, open http://localhost:3000 and click **Register GitHub App**. This will guide you through the process of registering and configuring the application. You will need to select the repository (or repositories) you want to use with the application as part of the setup process. When the workflow is completed, the `.env` file will be updated to match the configuration. 

### Manual GitHub App configuration

You can also manually [register a GitHub App](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/registering-a-github-app). You will want the following settings:

| Setting                          | Value                                           |
| -------------------------------- | ----------------------------------------------- |
| GitHub App name                  | Provide a name of your choosing |
| Homepage URL                     | Any valid URL, including a link to this repository |
| Identifying and autorizing users | Leave all settings empty |
| Post installation                | Leave all settings empty |
| Webhook - Active                 | Checked |
| Webhook URL                      | The URL of the running application (or its `smee.io` proxy). For Azure Functions or AWS Lambda, it should be the URL for the Function or Lambda. For a self-hosted application or container, it should be the HTTPS base URL for the host environment followed by `/api/github/webhooks`. |
| Webhook Secret                   | Any value. A GUID or random value is suggested |
| SSL verification                 | Enable SSL verification. The webhook should be hosted with an SSL certificate from a recognized global CA provider. |
| Private keys                     | Generate a new private key. This will save a text file to your computer. |
| Repository Permissions           | Code scanning alerts (read and write), Dependabot alerts (read and write), Metadata (read-only) Secret scanning alerts (read and write). All others can remain `No access`. |
| Organization Permissions         | Members (read-only). All others can remain `No access`. |
| Account Permissions              | All permissions should be `No access`. |
| Subscribe to events              | Select Code scanning alert, Dependabot alert, Secret scanning alert. All others can be left unselected. |

Make sure to install the App in your organization and configure it for the repositories you want to monitor.

### GitHub Codespaces

When using Codespaces, the environment will use a private port (3000) for the app and [smee.io](https://smee.io) as a proxy. A public Codespaces port cannot be used; public ports require a user to acknowledge the Codespaces environment, preventing webhooks from delivering directly to the URL. 

### Using a proxy

Production deployments of this application must be reachable from your GitHub environment. If you're using GitHub Enterprise Cloud or Enterprise Managed Users, that means it must be availble on the public internet. For local development, Probot relies on a public proxy (`smee.io`) to receive webhooks. The received webhooks are then forwarded to the local development environment. This prevents the development environment from needing to be exposed to the public internet.

> [!IMPORTANT]
> The `smee.io` proxy is not secure and should not be used in production environments. It is only intended for development and testing. Anyone with the URL can review the webhooks and see their included data.

When developing the code locally, the Probot application will automatically create and use an endpoint on `smee.io`. This will be added to the `.env` file automatically. For production usage, this behavior is disabled by setting the environment variable `NODE_ENV` to `production`.

To manually configure the App to use `smee.io` as a proxy for local development:

1. Go to https://smee.io/new. Copy the provided webhook URL.
1. Create (or update) the `packages/server/.env` file. An example file (`.env.example`) is provided in that directory.
1. Add a line with `WEBHOOK_PROXY_URL=` and the URL from Step 1. For example, `WEBHOOK_PROXY_URL=https://smee.io/ABCDEF

### The environment (.env) file

This file `.env` contains the environment settings used by the Probot application. A sample file is provided (`.env.sample`). The first time the application is run, an `.env` file will be created if it does not exist. If you're allowing the server to automatically create and register the GitHub App, the file will be automatically updated at the end of the registration process. Typically, there are only two settings that may need to be configured initially:

- `GH_ORG` - If a GitHub organization name is provided, the application is registered with an organization rather than the current user.
- `WEBHOOK_PROXY_URL` - Configure a proxy server that will receive all webhook messages. If not provided, this value will be created and populated automatically in development environments. This value should not use configured in non-development environments.

### First launch

The first time the application is run, it will open a port (typically https://localhost:3000) and listen for incoming messages.

Opening this page in the browser will start a process of configuring and registering the GitHub App. This process is called the [Manifest Flow](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app-from-a-manifest). The configuration settings in the `app.yml` file are used to register the application, associate it with a public webhook URL, and secure the communications.  Once this process completes, the `.env` file will be updated based on that registration. The web page will then be changed to disable the registration process. Deleting the `.env` settings file for the application will allow you to re-run the registration process.

For non-development deployments and builds, this functionality is disabled.

### Known Issues

This sample application has the following known issues.

#### ECONN Error
When running in a development container (Visual Studio Code), the Docker environment can occasionally stop correctly proxying messages. When this occurs:

- The GitHub App and `smee.io` will both report that payloads were delivered. The application will not show any activity.
- The Node.js application may occasionally log an error beginning with `ECONN`.

If this occurs, restart Docker Desktop. Visual Studio code can reload the window once Docker Desktop has restarted, and `yarn start` can be used to restart the application. The connectivity issues should be resolved.

#### Container build

A standalone image can be built using `yarn run build:container` in the `packages/server` directory. The image uses the Node.js Alpine image, and the final image is around 135 MiB. The image is configured to expose port 80. The application is compiled into a standalone JavaScript file, eliminating the need for a `node_modules` folder or additional dependencies. The code is deployed in the working directory, `/opt/probot`. Because it works as a standalone scripts, there is no `packages.json` file in the image. The container is configured to run using the `node` user.

The container build allows passing the following variables:

| Variable | Description |
| -------- | ----------- |
| `APP_ROOT` | The root directory for the application. Defaults to `/opt/probot` |
| `ARG NODE_VERSION` | The Node.js version to use. Defaults to `20`. |
| `ARG OS_BASE` | The base image to use. Defaults to `alpine3.18`. |

These variables can be passed to the Yarn build command. For example:

```sh
yarn run build:container --build-arg="NODE_VERSION=22" --build-arg="OS_BASE=slim"
```

For testing and deploying outside of development environments, the GitHub App will need to be created manually, as detailed above. For running directly from Docker, `--env-file` parameter can be used to provide the environment settings as an `.env` file. Alternatively, individual environment variables can be provided using the `-e` parameter.

The following environment variables need to be configured and provided to the container:

| Variable                    | Value                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | `production`. This is preconfigured in the image.                                                                |
| `APP_ID`                    | The identifier for the registered app. This can be found in the App's *General* > *About*.                       |
| `GH_ORG`                    | The name of the owning GitHub organization.                                                                      |
| `PRIVATE_KEY`               | The text from the private key file. This can be created in *General* > *Private keys* > *Generate a private key* |
| `PRIVATE_KEY_PATH`          | Path to the private key if it is stored on the file system or provided as a secret volume                        |
| `WEBHOOK_SECRET`            | The GitHub App's webhook secret. A value should always be provided in *General* > *Webhook* > *Webhook secret*   |
| `SECURITY_ALERT_CLOSE_TEAM` | The name of a custom approving team if the default is not used                                                   |

> **Note** 
> For production environments, ensure that secrets, IDs, and private keys are stored securely. Ideally, these should only be exposed as environment variables.

Additional environment variables can be found in the [Probot documentation](https://probot.github.io/docs/configuration/). The application endpoint must be available to be called by GitHub. The IP addresses used by GitHub Enterprise Cloud for webhooks are listed at https://api.github.com/meta.

The build process has multiple stages available which can be built separately for debugging or troubleshooting. The stages are:

| Stage     | Description |
| --------- | ----------- |
| base      | The base OS image with Node installed |
| buildbase | Enables corepack and Yarn |
| codebase  | Adds the code as a linked layer to the image |
| build     | Tests and builds the app and server packages, creating a minimize single file for distribution |
| (default) | Final image, combining the minimized server file (`index.mjs`) with the base image |

#### AWS Lambda build

The `packages/aws` folder containers the code and configuration for deploying the application to AWS Lambda using the AWS Serverless Application Model (SAM). The development container includes the AWS CLI and SAM CLI. The provided configuration will return a single output value, `WebhookUrl`. This value can be used for the GitHub App's webhook URL.

The following commands can be used for configuration and deployment.

| Command | Description |
| ------- | ----------- |
| `yarn run build` | Creates an `.aws-sam` directory containing all of the required deployment artifacts |
| `yarn run build:container` | Creates an amd64 Docker image for the Lambda function |
| `yarn run deploy` | Performs a guided deployment of the Lambda application to AWS Lambda using the SAM CLI |

A debug configuration is provided for launching the AWS Lambda locally. The configurtion currently does not fully support debugging.

> [!IMPORTANT]
> GitHub webhooks expect a response within 10 seconds. Be sure to validate that your Lambda configuration will allow the function to respond within the required timeframe.

#### Azure Functions

The `packages/azure` folder contains the code and configuration for deploying the application to Azure as a Function using the Azure Function Core Tools. Currently, these tools only work when running the development container in GitHub Codespaces or on an amd64 development environment. The tools are not yet officially supported on ARM64 Linux.

A debug configuration is provided for launching the Azure Function locally.

> [!IMPORTANT]
> GitHub webhooks expect a response within 10 seconds. This may require a Premium Azure Function plan to ensure the Function's [cold start behavior](https://learn.microsoft.com/en-us/azure/azure-functions/functions-scale#cold-start-behavior) will allow it to respond within the required timeframe.

### Installation

There are several ways you can host your application.

#### Azure

The application can be hosted in Microsoft Azure using [Azure Functions](https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview?pivots=programming-language-csharp), we have provided scripts and infrastructure as code bicep templates to provision all necessary resources.

If you want to run the application in Azure, jump to [Azure Installation](docs/Azure-Install.md) guide, all you need is an Azure Subscription.

## Using GitHub Security Managers

It is possible to configure the approving team as a child of the team assigned to the [Security Managers](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization) role. You can [follow these steps to create a child team](https://docs.github.com/en/enterprise-cloud@latest/organizations/organizing-members-into-teams/requesting-to-add-a-child-team). Because this team is a child of the previous team, it is included in the Security Managers. All members of this child team will be Security Managers and able to review alerts in all repositories.

> [!NOTE]
> The Security Managers for an organization automatically have read access to all repositories.
> This permission is not removed if the team is removed from the Security Managers.
