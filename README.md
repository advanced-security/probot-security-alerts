# Code Scanning Alert Watcher

A sample GitHub App built with [Probot](https://github.com/probot/probot) that demonstrates
how to monitor and respond to code scanning alert events. The application is written
in TypeScript, running on Node.js 16. A developer container is provided which creates a
standalone environment for development.

The application automatically re-opens any security alert which is closed by someone
that is not part of the `approving-alerters` team. This team name is configured in 
[codeScanningAlertDismissed.ts](./src/events/codeScanningAlertDismissed.ts#L40).

## GitHub Setup

The application expects two teams to exist in your organization:
- A [team](https://docs.github.com/en/enterprise-cloud@latest/organizations/organizing-members-into-teams/creating-a-team) that has been assigned as the [Security Managers](https://docs.github.com/en/enterprise-cloud@latest/organizations/managing-peoples-access-to-your-organization-with-roles/managing-security-managers-in-your-organization)
- A [child team](https://docs.github.com/en/enterprise-cloud@latest/organizations/organizing-members-into-teams/requesting-to-add-a-child-team) that is called `approving-alerters` which contains only those users that should be able to
  close the alerts. Note that organization owners are automatically approved and do not need to be included. Because
  this team is a child of the previous team, it is included in the Security Managers

> Note:  
> The Security Managers for an organization automatically have read access to all repositories.
> This permission is not removed if the team is removed from the Security Managers.


## Setup and Local Development

The application will automatically create a `.env` as part of its setup process, but this process is
not initially aware of any GitHub organization. Create an initial `.env` file which contains 
the following line:

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

The `start` command starts a background process that monitors changes to the
TypeScript source files. Nodemon is used to automatically restart the Node.js application
when the TypeScript-generated files in `dist` are changed.

Open http://localhost:3000 and click **Register GitHub App**. This will guide you through the process of registering and configuring the application. You will need to select the repository (or repositories) you want to use with the application as part of the setup process. When the workflow is completed, the `.env` file will be updated to match the configuration. 

> Note:  
> For production applications, the environment settings should be configured 
> using appropriate secret and environment variable management.

## Known Issues
When running in a development container (Visual Studio Code), the Docker environment can occasionally stop correctly proxying messages. When this occurs:

- The GitHub App and Smee.io will both report that payloads were delivered. The application will not show any activity.
- The Node.js application may occasionally log an error beginning with ECONN.

If this occurs, restart Docker Desktop. Visual Studio code can reload the window once Docker Desktop has restarted, and `npm start` can be used to restart the application. The connectivity issues should be resolved.