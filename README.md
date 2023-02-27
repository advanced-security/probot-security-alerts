# Probot Security Alert Watcher

This repository contains a sample GitHub App built with [Probot](https://github.com/probot/probot) that demonstrates how to monitor and respond to security alert events. The application automatically re-opens any security alert which is closed by someone that is not part of a specific team. It responds to alerts from code scanning, secret scanning, and Dependabot.

## Requirements

The repository contains a [development container](https://docs.github.com/en/codespaces/setting-up-your-project-for-codespaces/adding-a-dev-container-configuration/introduction-to-dev-containers) that supports Visual Studio Code or GitHub Codespaces. This container includes all of the required dependencies. The application is written in TypeScript and runs on Node.js 18. To develop the project without a development container, [Node.js 18](https://nodejs.org/en/download/) must be installed. Running `npm install` will configure the other dependencies.

The application expects a team called `scan-managers` to exist in your organization. This team contains the users that are approved to close code scanning alerts. If the team does not exist, all requests will be rejected. Alerts closed by users that are not part of this team will be automatically reopened. The name can be changed by configuring the environment variable `SECURITY_ALERT_CLOSE_TEAM`.

## License 

This project is licensed under the terms of the MIT open source license. Please refer to the [LICENSE](./LICENSE) for the full terms.

## Maintainers 

The current project maintainers can be found in [CODEOWNERS](./.github/CODEOWNERS).

## Setup and Local Development

The application will automatically create a `.env` as part of its setup process, but will register the App to the current user's GitHub account by default. To configure the registration to use an organization, create an initial `.env` file which contains the following line:

```sh
GH_ORG=your-org-name
```

This will ensure that your application is properly configured and registered with that organization.

To setup and configure the project, run the following commands:

```sh
# Install dependencies (if not using dev container)
npm install

# Run the application
npm start
```

When running inside of a dev container or Codespaces, `npm install` will be automatically run.

The `start` command starts a background process that monitors changes to the TypeScript source files. Nodemon is used to automatically restart the Node.js application when the TypeScript-generated files in `dist` are changed.

Open http://localhost:3000 and click **Register GitHub App**. This will guide you through the process of registering and configuring the application. You will need to select the repository (or repositories) you want to use with the application as part of the setup process. When the workflow is completed, the `.env` file will be updated to match the configuration. 

### GitHub Codespaces

When using Codespaces, the environment will use a private port (3000) for the app and [smee.io](https://smee.io) as a proxy for public visibility. If you do not want to use SMEE, the Codespaces port will need public visibility to be reachable. There is a [feature request](https://github.com/devcontainers/spec/issues/5) to add support for specifying port visibility in `devcontainer.json`.

To configure visibility manually:

1. Ensure the Probot application has been started using `npm run` and that it has started listening on port 3000.
1. Open the Command Pallette using Shift + Command + P (Mac) / Ctrl + Shift + P (Windows/Linux)
1. Choose **Ports: Focus on Ports View**
1. Right click the line that contains the port **Probot (3000)**
1. Select **Port Visibility** and change the value to **Public**

### Using a proxy

The GitHub App will automatically create an use an endpoint on smee.io as a proxy if the environment variable `NODE_ENV` is not set to `production`. It will create a new endpoint and add it to the `.env` file automatically. To manually configure the App to use Smee.io as a proxy for a private port or local development environment:

1. Go to https://smee.io/new. Copy the provided webhook URL.
1. Create (or update) a `.env` file. An example file (`.env.example`) is provided.
1. Add a line with `WEBHOOK_PROXY_URL=` and the URL from Step 1. For example, `WEBHOOK_PROXY_URL=https://smee.io/ABCDEF

### The environment (.env) file

This file `.env` contains the environment settings used by the Probot application. A sample file is provided (`.env.sample`). The first time the application is run, the file will be created. Once the GitHub App is registered, the file will be updated with the security settings required for creating tokens. Typically, there are only two settings that may need to be configured initially:

- `GH_ORG` - Configure the application to register with an organization rather than the current user, specify the organization name
- `WEBHOOK_PROXY_URL` - Configure a proxy server that will receive all webhook messages. If not provided, this will be created automatically in non-production environments.

### First launch

The first time the application is run, it will open a port (typically https://localhost:3000) and listen for incoming messages.
Opening this page in the browser will start a process of configuring and registering the GitHub App. This process is called the [Manifest Flow](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app-from-a-manifest). The configuration settings in the `app.yml` file are used to register the application, associate it with a public webhook URL, and secure the communications.  Once this process completes, the `.env` file will be updated based on that registration. The web page will then be changed to disable the registration process.

Removing the `.env` settings for the application will re-enable the process.

> **Note**
> Support for Dependabot alerts is in beta. As a result, the `dependabot_alert` event is not yet supported by manifest flow. After installing the GitHub App, you will need to edit the app's **Settings**. In **Permissions & events** > **Subscribe to events**, enable **Dependabot alert** and press **Save Changes**. If this event is not enabled, Dependabot alerts will not be monitored.

### Known Issues

This sample application has the following known issues.

#### ECONN Error
When running in a development container (Visual Studio Code), the Docker environment can occasionally stop correctly proxying messages. When this occurs:

- The GitHub App and Smee.io will both report that payloads were delivered. The application will not show any activity.
- The Node.js application may occasionally log an error beginning with ECONN.

If this occurs, restart Docker Desktop. Visual Studio code can reload the window once Docker Desktop has restarted, and `npm start` can be used to restart the application. The connectivity issues should be resolved.

#### Probot Support

This sample is built using [Probot](https://github.com/probot/probot) and the framework it provides. The latest version of Probot does not yet fully support the new dependabot alerts.

#### GitHub manifest flow

The manifest flow does not currently support Dependabot alerts. The events will need to be manually selected.

#### Container build
A standalone image can be built using `docker build`. The image uses a minimal distribution, running Node.js on Alpine. It supports all Alpine-supported architectures. The image is configured to expose port 3000. For additional security, the `node_modules` folder is placed above the working directory with the app. When the directory is missing in the application folder, Node.js will automatically search the parent folder. This prevents the modules and their binaries from being exposed by the web service. The application is installed in `/opt/probot/app`, configurable at build time with the build argument `APP_ROOT`.

For testing and deploying outside of development environments, the GitHub App will need to be [created manually](https://docs.github.com/en/apps/creating-github-apps/creating-github-apps/creating-a-github-app). The currently required permissions and events can be found in the [app.yml](./app.yml) file.

The following environment variables need to be configured and provided to the container:

| Variable                    | Value                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | `production`. This is preconfigured in the image.                                                                |
| `APP_ID`                    | The identifier for the registered app. This can be found in the App's *General* > *About*.                       |
| `GH_ORG`                    | The name of the owning GitHub organization.                                                                      |
| `PRIVATE_KEY`               | The text from the private key file. This can be created in *General* > *Private keys* > *Generate a private key* |
| `PRIVATE_KEY_PATH`          | Path to the private key if it is stored on the file system or provided as a secret volume                        |
| `WEBHOOK_SECRET`            | The GitHub App's webhook secret. A value should always be provided in *General* > *Webhook* > *Webhook secret*   |
| `GITHUB_CLIENT_ID`          | The App Client ID. This can be found in the App's *General* > *About*.                                           |
| `GITHUB_CLIENT_SECRET`      | A client secret. This can be found in the App's *General* > *Client Secrets* > *Generate a new client secret*    |
| `SECURITY_ALERT_CLOSE_TEAM` | The name of a custom approving team if the default is not used                                                   |

> **Note** 
> For production environments, ensure that secrets, IDs, and private keys are stored and provided securely. 

Additional environment variables can be found in the [Probot documentation](https://probot.github.io/docs/configuration/).

## Using GitHub Security Managers

It is possible to configure the approving team as a child of the team assigned to the [Security Managers](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization) role. You can [follow these steps to create a child team](https://docs.github.com/en/enterprise-cloud@latest/organizations/organizing-members-into-teams/requesting-to-add-a-child-team). Because this team is a child of the previous team, it is included in the Security Managers. All members of this child team will be Security Managers and able to review alerts in all repositories.

> **Note**  
> The Security Managers for an organization automatically have read access to all repositories.
> This permission is not removed if the team is removed from the Security Managers.
