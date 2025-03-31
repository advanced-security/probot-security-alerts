# Azure Installation

## Pre requirements

In order to install the application you will need:

- An Azure subscription:
  - With Contributor role (or owner role) at the subscription level to create [resource groups](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/manage-resource-groups-portal) and resources
    - Or with a custom role with `Microsoft.Resources/subscriptions/resourceGroups/write` permissions.
  - Contributor permission at a resource group created for this purpose by someone who has permissions to create and grant you access to the resource group.
- A machine that can run bash scripts and has the following software installed:
  - Node 20
  - [Yarn](https://yarnpkg.com/) package manager
  - [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/)
  - [JQ](https://stedolan.github.io/jq)
  - [curl](https://curl.se/)

> [!TIP]
> We have provided a [development container](https://containers.dev/) with all the necessary dependencies. Devcontainer can be with [GitHub Codespaces](https://github.com/codespaces) with a click of a button or you can use it to [develop locally on your machine](https://code.visualstudio.com/docs/devcontainers/containers).
> While this is not necessary it simplifies getting the dependencies.

## Configuring GitHub Application

The steps to configure the application have been already described in the [Setup and Local Development](../README.md#setup-and-local-development) of the README file, let's repeat here the simplified steps.

This will both register and install the application on the account of your choice.

1. Make sure you are logged on GitHub on your default browser
1. Create a file in `packages/server/env`
    * With a line `GH_ORG=your-org-name` if you want to register the application in an [organization](https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts#organization-accounts) (replace `your-org-name` with your organization name)
    * Leave it empty if you want to register the application in your [personal account](https://docs.github.com/en/get-started/learning-about-github/types-of-github-accounts#personal-accounts).
    * This will define in which account the application will be registered.
1. Open a shell and run the following commands in order:
   1. run `yarn install`
   1. run `yarn run build`
   1. run `yarn run start`
1. Open https://localhost:3000 in a browser (if running on a codespace follow the link shown in the popup or go to the ports tab and open the forwarded address)
1. You will see a robot welcoming you to `Welcome to @security-alert-watcher/server`
1. Click on the `Register GitHub App` button (a new tab will automatically open)
1. Replace the `Security Alert Watcher` in the GitHub App name text box with a name that is meaningful to you (the name needs to be unique across GitHub, so if you accept the default one you may get a message it's already taken) and click on `Create GitHub App for <account>`
1. If you have multiple accounts, you may be asked to confirm the account you want to use. Select the appropriate one
1. You will be taken into a page that says at the top `Install <name of the app you entered before>`, select if you want install the App in:
   * All repositories - (recommended) If you want the application to be active on all repositories.
   * Only select repositories - If you want to the application to be active in the selected repositories (you can change this later).
1. Click on the `Install` button (You can also see the permissions the application on the repositories it will be installed).
1. The application is now installed in the account you have defined in the `.env` file
   * You can come back later to this screen to suspend or uninstall the application on this account.
1. Optional click on `App Settings` under the application name at the top to see all app settings.

With the application registered and installed, we are now ready to provision the Azure resources and install the application.

> [!IMPORTANT]
> The application is configured as a [private application](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/about-creating-github-apps#building-a-github-app) this means it can only be installed on the account that owns it.

## Installing on Azure

To provision, install and configure the application all you need is to run the script  `provision-and-deploy`

> [!IMPORTANT]
> Before running the script, you need to be logged in on Azure with Azure CLI. If yo are not logged in, the script will tell you so. See [Authenticate to Azure using Azure CLI](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli)

> [!NOTE] 
> There are more parameters if you want further customization of the provisioning and deploy process. If you want to see the remaining paramers
> go to the section `Parameters for provision-and-deploy` for further tweaking.

> [!WARNING]
> If you are going to install the application in an enterprise/organization with [IP Allow lists](https://docs.github.com/en/enterprise-cloud@latest/admin/configuration/hardening-security-for-your-enterprise/restricting-network-traffic-to-your-enterprise-with-an-ip-allow-list) enabled, then the application will not work out of the box, and you > have to make manual adjustments to make it work. (see [Function app outbound IP addresses](https://learn.microsoft.com/en-us/azure/azure-functions/ip-addresses?tabs=portal#find-outbound-ip-addresses))

With these simple call, you will be ready to go in no time, this script will:

- Create an Azure resource group (if it doesn't exist already)
- Provisions the necessary Azure Resources:
   - [KeyVault](https://learn.microsoft.com/en-us/azure/key-vault/general) to store the following secrets:
      - The application PEM certificate
      - Webhook secret
   - [Function](https://learn.microsoft.com/en-us/azure/azure-functions/) with a [consumption plan](https://learn.microsoft.com/en-us/azure/azure-functions/consumption-plan) with the following environment variables
      - GitHub Application ID
      - Application Insights connection string
      - Points webhook secrets and private key values to Key Vault secrets.
      - All the variables necessary for the function to run
   - [Storage account](https://learn.microsoft.com/en-us/azure/storage/blobs/) to hold the function code
   - [Application Insights](https://learn.microsoft.com/en-us/azure/azure-monitor/app/app-insights-overview) for logs and analytics
- Deploys the GitHub application code to the Azure Function
- Updates the GitHub application webhook URL to point to the GitHub app running in functions.

```shell
# location parameter is optional. The default value is eastus
./packages/azure/setup/provision-and-deploy.sh --resource-group <resource group> --function-name <function name> --location westus2
```

> [!NOTE] if you don't specify the location, eastus is used by default. See here the list of [Azure Regions](https://azure.microsoft.com/en-us/explore/global-infrastructure/geographies/#geographies). Azure functions may not be available on all regions.

`<function name>` needs to be universally unique in Azure (no spaces, alpha and hyphens allow), but the name you choose has no impact on the application (for more information on naming restrictions see sites names in [Naming rules and restrictions for Azure resources](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftweb)).

After you execute the command, wait a few minutes and if there are no errors you are good to good, your application is now running as an Azure Function.

### Parameters for provision-and-deploy.sh

`resource group` and `function name` are the minimum parameters needed for provisioning and deploying the app, but the script can receive more parameters:

- `-a` or `--app-id` The GitHub application id. This value is read automatically from `packages/server/.env` file, but it can be overridden.
- `--function-name <name>` The name of the function to provision/deploy. This needs to be universally unique (see [Naming rules and restrictions for Azure resources](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftweb))
- `--function-short-name <short name>` (max 6 chars) This is a short name, used to create resources that need to be unique (based on resource group name). You don't need to care about this parameter unless you are going to deploy more than one instance in the same resource group (not recommended).
- `-k` or `--private-key` - The Private key for the application. In case you lose the key, you can generate a new one from the app settings pages.
- `--webhook-secret <secret>` - The webhook secret to calculate the MAC digest of the webhook, this is used to [verify](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries#about-validating-webhook-deliveries) if the received webhook was really sent by GitHub.
- `--skip-app-webhook-update` Do not update the application webhook url. If you specify this parameter it means the application will continue to point to `smee` and the function will never receive any data.
- `-g <resource group name>` or `--resource-group <resource group name>` The Resource group to store the resources. If if doesn't exist, it will be created (if you have permissions).
- `-l <location>` or `--location <location>` (default eastus) The location for all created resources.
- `--app-insights-location <location>` The location for Application Insights (if you want to placed in a location different from other resources.)
- `--set-ip-restrictions` Enable IP restrictions, if you want to [restrict Access](https://learn.microsoft.com/en-us/azure/azure-functions/functions-networking-options?tabs=azure-portal) to the function app only to GitHub webhooks IPs. The list of IPs dinamically read from the [GitHub Meta API](https://docs.github.com/en/rest/meta/meta?apiVersion=2022-11-28#get-github-meta-information), if this list is updated you will have to update the function configuration. This also means you cannot make direct requests to the function.
- `--
### Calling scripts individually

The `provision-and-deploy.sh` script configures and deploys the application in one go, but you can also call the scripts individually if you want to do it step by step, or if you later want to just perform some operations.

#### provision-resources.sh

The `provision-resources.sh` script creates the necessary resources in Azure uzing the [Bicep template](../packages/azure/setup/function.bicep)

```shell
./packages/azure/setup/provision-resources.sh --resource-group <resource group> --function-name <function name>
```

This script has the following parameters:

- `-a` or `--app-id` The GitHub application id. This value is read automatically from `packages/server/.env` file, but it can be overridden.
- `--function-name <name>` The name of the function to provision/deploy. This needs to be universally unique (see [Naming rules and restrictions for Azure resources](https://learn.microsoft.com/en-us/azure/azure-resource-manager/management/resource-name-rules#microsoftweb))
- `--function-short-name <short name>` (max 6 chars) This is a short name, used to create resources that need to be unique (based on resource group name). You don't need to care about this parameter unless you are going to deploy more than one instance in the same resource group (not recommended).
- `-k` or `--private-key` - The Private key for the application. In case you lose the key, you can generate a new one from the app settings pages.
- `--webhook-secret <secret>` - The webhook secret to calculate the MAC digest of the webhook, this is used to [verify](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries#about-validating-webhook-deliveries) if the received webhook was really sent by GitHub.
- `-g <resource group name>` or `--resource-group <resource group name>` The Resource group to store the resources. If if doesn't exist, it will be created (if you have permissions).
- `-l <location>` or `--location <location>` (default eastus) The location for all created resources.
- `--app-insights-location <location>` The location for Application Insights (if you want to placed in a location different from other resources.)
- `--set-ip-restrictions` Enable IP restrictions, if you want to [restrict Access](https://learn.microsoft.com/en-us/azure/azure-functions/functions-networking-options?tabs=azure-portal) to the function app only to GitHub webhooks IPs. The list of IPs dinamically read from the [GitHub Meta API](https://docs.github.com/en/rest/meta/meta?apiVersion=2022-11-28#get-github-meta-information), if this list is updated you will have to update the function configuration. This also means you cannot make direct requests to the function.

#### deploy-function.sh

Builds and deploys the function to Azure, if you make changes to the code all you need to do is run this script to deploy it.

```shell
./packages/azure/setup/deploy-function.sh --resource-group <resource group> --function-name <function name>
```
#### update-app-webhookurl.sh

Updates the GitHub application webhook URL to point to the Azure Function.

```shell
./packages/azure/setup/update-app-webhookurl.sh --resource-group <resource group> --function-name <function name> 
```

This script has the following parameters:

- `-a` or `--app-id` The GitHub application id. This value is read automatically from `packages/server/.env` file, but it can be overridden.
- `--function-name <name>` The name of the function.
- `-k` or `--private-key` - The Private key for the application. This value is read automatically from `packages/server/.env` file, but it can be overridden.
- `-g <resource group name>` or `--resource-group <resource group name>` The Resource group of the function.

