# Code Scanning Alert Watcher

A sample GitHub App built with [Probot](https://github.com/probot/probot) that demonstrates how to monitor and respond to code scanning alert events. The application is written in TypeScript, running on Node.js 16. A developer container is provided which creates a standalone environment for development.

The application automatically re-opens any security alert which is closed by someone
that is not part of the `scan-managers` team. This team name is configured in [codeScanningAlertDismissed.ts](./src/events/codeScanningAlertDismissed.ts#L4`) and can be overriden using the environment variable `SCAN_CLOSE_TEAM`.


## GitHub Organization Setup

The application expects a team called `scan-managers` (or the value in the environment variable `SCAN_CLOSE_TEAM`) to exist in your organization. This team contains the users that are approved to close code scanning alerts. Note that organization owners are automatically included and will not need to be added.

All other users attempting to close an alert will be rejected.

## GitHub Security Managers

It is possible to configure the approving team as a child of the team assigned to the [Security Managers](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization) role. You can [follow these steps to create a child team](https://docs.github.com/en/enterprise-cloud@latest/organizations/organizing-members-into-teams/requesting-to-add-a-child-team). Because this team is a child of the previous team, it is included in the Security Managers.

> **Note**  
> The Security Managers for an organization automatically have read access to all repositories.
> This permission is not removed if the team is removed from the Security Managers.

## Setup and Local Development

The application will automatically create a `.env` as part of its setup process, but this process is not initially aware of any GitHub organization. Create an initial `.env` file which contains the following line:

```sh
GH_ORG=your-org-name
```

This will ensure that your application is properly configured and registered to use the organization.

To setup and configure the project, run the following commands:

```sh
# Install dependencies
npm install

# Run the application
npm start
```

When running inside of a dev container or Codespaces, `npm install` will be automatically run.

The `start` command starts a background process that monitors changes to the TypeScript source files. Nodemon is used to automatically restart the Node.js application when the TypeScript-generated files in `dist` are changed.

Open http://localhost:3000 and click **Register GitHub App**. This will guide you through the process of registering and configuring the application. You will need to select the repository (or repositories) you want to use with the application as part of the setup process. When the workflow is completed, the `.env` file will be updated to match the configuration. 

## GitHub Codespaces

When using Codespaces, the environment will use a private port and will not use [smee.io](https://smee.io) as a proxy. The port will need public visibility to be reachable without using a proxy service. There is a [feature request](https://github.com/devcontainers/spec/issues/5) to add support for specifying port visibility in `devcontainer.json`.

To configure visibility manually:

1. Ensure the Probot application has been started using `npm run` and that it has started listening on port 3000.
1. Open the Command Pallette using Shift + Command + P (Mac) / Ctrl + Shift + P (Windows/Linux)
1. Choose **Ports: Focus on Ports View**
1. Right click the line that contains the port **Probot (3000)**
1. Select **Port Visibility** and change the value to **Public**

## Using a proxy

To use Smee.io as a proxy for a private port or local development environment:

1. Go to https://smee.io/new. Copy the provided webhook URL.
1. Create (or update) a `.env` file. An example file (`.env.example`) is provided.
1. Add a line with `WEBHOOK_PROXY_URL=` and the URL from Step 1. For example, `WEBHOOK_PROXY_URL=https://smee.io/ABCDEF`

Alternatively, you can use set the environment variable manually in the Terminal window.

## The environment (.env) file

This file `.env` contains the environment settings used by the Probot application. A sample file is provided (`.env.sample`). The first time the application is run and the GitHub App is registered, the file will be created. If the file already exists, the settings will be updated to include the APP_ID and security settings for the registered application. Typically, there
are only two settings that may need to be configured initially:

- `GH_ORG` - Configure the application to register with an organization rather than the current user, specify the organization name
- `WEBHOOK_PROXY_URL` - Configure a proxy server that will receive all webhook messages

## First launch

The first time the application is run, it will open a port (typically https://localhost:3000) and listen for incoming messages.
Opening this page in the browser will start a process of configuring and registering the GitHub App. This process is called the [Manifest Flow](https://docs.github.com/en/developers/apps/building-github-apps/creating-a-github-app-from-a-manifest). The configuration settings in the `app.yml` file are used to register the application, associate it with a public webhook URL, and secure the communications.  Once this process completes, the `.env` file will be updated based on that registration. The web page will then be changed to disable the registration process.

Removing the `.env` settings for the application will re-enable the process.

## Known Issues
When running in a development container (Visual Studio Code), the Docker environment can occasionally stop correctly proxying messages. When this occurs:

- The GitHub App and Smee.io will both report that payloads were delivered. The application will not show any activity.
- The Node.js application may occasionally log an error beginning with ECONN.

If this occurs, restart Docker Desktop. Visual Studio code can reload the window once Docker Desktop has restarted, and `npm start` can be used to restart the application. The connectivity issues should be resolved.

## Container Build
A standalone image can be built using `docker build`, and `docker run` can be used to launch the container. The image is configured to expose port 3000. As a development environment, it will require the environment variable `GH_ORG` to enable setup to use an organization.

For testing and deploying outside of development environments, the following environment variables would need to be configured:

- `NODE_ENV` (set to `production`)
- `APP_ID`
- `GH_ORG`
- `PRIVATE_KEY`
- `WEBHOOK_SECRET`
- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`
- `SCAN_CLOSE_TEAM` (if using a different team name)

The complete set of variables and the details for setting those are available in the [Probot documentaton](https://probot.github.io/docs/configuration/).

> **Note**  
> For production applications, the environment settings should be configured 
> using appropriate secret and environment variable management.
