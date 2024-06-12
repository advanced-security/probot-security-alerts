#!/bin/env bash

set -euo pipefail

PrintUsage()
{
  COMMAND=${COMMAND_NAME:-$(basename "$0")}

  cat <<EOM

Provisions necessary resources and deploys a GitHub App as an Azure Function

Usage: ${COMMAND} [options]

Options:
    -h, --help                    : Show script help

    -a, --app-id                  : GitHub application ID

    --function-name               : Function name. This name needs to be globally unique on Azure

    --function-short-name         : Function short name, this will be used for azure resources prefix to make it easier to
                                    identify them by name. Must be 6 characters or less.

                                    Default value: [$APP_SHORT_NAME]
 
    -k, --private-key             : Private key for the GitHub application (PEM format)

    --webhook-secret              : The WebHook secret to use for the GitHub application
                                    Optional but recommended.

    --skip-app-webhook-update     : After deploying the function, the app webkook url is automatically configured with the 
                                    function url. Use this flag to skip this step.
    -g, --resource-group          : Resource group to provision the resources in (it will be created if it doesn't exist)

    -l --location                 : Location to provision the resources in (default: [$LOCATION])

    --app-insights-location       : Location to provision application insights (default: [$APPINSIGHTS_LOCATION])

    --set-ip-restrictions         : (flag) Set IP restrictions on the function app to only allow traffic from the GitHub hook IP addresses.
                                    Fetches the values automatically from GitHub Meta API (default: false)

Note: If you have configured the GitHub application already the application id, private key and webhook secret will be automatically fetched 
from the .env file

Description:

Examples:
  ${COMMAND} -a 123 -k \$KEY_CONTENT -g my-probot-security-alerts --function-name my-probot-security-alerts --set-ip-restrictions
  ${COMMAND} --app-id 123 --key \$KEY_CONTENT -g my-probot-security-alerts --function-name my-probot-security-alerts --function-short-name alerts

EOM
  exit 0
}

####################################
# Default Values
# ##################################

LOCATION=${LOCATION:-"eastus"}
APPINSIGHTS_LOCATION=${APPINSIGHTS_LOCATION:-$LOCATION}
APP_SHORT_NAME=${APP_SHORT_NAME:-"secalt"}
SET_IP_RESTRICTION=${SET_IP_RESTRICTION:-false}
SKIP_APP_WEBHOOK_UPDATE=${SKIP_APP_WEBHOOK_UPDATE:-false}

# get base directory and read env file
scripts_path=$(dirname "$0")
source "${scripts_path}/_common.sh"
base_path=$(get_base_path)

loadEnvFile

PARAMS=""
while [[ $# -gt 0 ]]; do
  case $1 in
    -h|--help)
      PrintUsage;
      ;;
    -g|--resource-group)
      RG=$2
      shift 2
      ;;
    -l|--location)
      LOCATION=$2
      shift 2
      ;;
    --app-insights-location)
      APPINSIGHTS_LOCATION=$2
      shift 2
      ;;
    -a|--app-id)
      APP_ID=$2
      shift 2
      ;;
    -k|--key)
      PRIVATE_KEY=$2
      shift 2
      ;;
    --webhook-secret)
      WEBHOOK_SECRET=$2
      shift 2
      ;;
    --function-name)
      APP_NAME=$2
      shift 2
      ;;
    --function-short-name)
      APP_SHORT_NAME=$2
      shift 2
      ;;
    --set-ip-restrictions)
      SET_IP_RESTRICTION=true
      shift
      ;;
    --skip-app-webhook-update)
      SKIP_APP_WEBHOOK_UPDATE=true
      shift
      ;;
    --) # end argument parsing
      shift
      break
      ;;
    -*) # unsupported flags
      echo "Error: Unsupported flag $1" >&2
      exit 1
      ;;
    *) # preserve positional arguments
  PARAMS="$PARAMS $1"
  shift
  ;;
  esac
done

function validateParameters()
{
	missing_params=false
	if [ -z ${APP_ID+x} ]; then
		echo "GitHub Application ID is a required parameter. Use --app-id to specify it"
		missing_params=true
	fi

	if [ -z ${PRIVATE_KEY+x} ]; then
		echo "Private Key is a required parameter. Use --key or -k to specify it"
		missing_params=true
	fi

	if [ -z ${WEBHOOK_SECRET+x} ]; then
		echo "WebHook Secret is a required parameter. Use --webhook-secret to specify it"
		missing_params=true
	fi

	if [ -z ${RG+x} ]; then
		echo "Resource Group is a required parameter. Use --resource-group or -g to specify it"
		missing_params=true
	fi

	if [ -z ${LOCATION+x} ]; then
		echo "Location is a required parameter. Use --location or -l to specify it"
		missing_params=true
	fi

	if [ -z ${APP_NAME+x} ]; then
		echo "Function App Name is a required parameter (must be globally unique). Use --function-name to specify it"
		missing_params=true
  else
    if ! validateFunctionName $APP_NAME ; then
      echo "Function name must be alphanumeric and can contain hyphens (cannot start or end with an hyphen). It must be between 2 and 60 characters long."
      missing_params=true
    fi
	fi

	if [ -z ${APP_SHORT_NAME+x} ]; then
		echo "Function App Short Name is a required parameter. Use --function-short-name to specify it"
		missing_params=true
	fi

	# fail if there are missing parameters
	if [ "$missing_params" = true ]; then
		echo -e "\nMissing or invalid parameters (list above).\n"
		PrintUsage
	fi
}

########### BEGIN
validateParameters
validateRequirements
validAzureLogin

FLAGS=""
if [ "$SET_IP_RESTRICTION" = true ]; then
  FLAGS="--set-ip-restrictions"
fi

# PASS secrets and env variables as env variables
SKIP_TIPS=true SKIP_ENV_FILE=true PRIVATE_KEY=$PRIVATE_KEY WEBHOOK_SECRET=$WEBHOOK_SECRET "${scripts_path}/provision-resources.sh" \
  --app-id "$APP_ID" \
  --resource-group "$RG" \
  --location "$LOCATION" \
  --function-name "$APP_NAME" \
  --function-short-name "$APP_SHORT_NAME" \
  --app-insights-location "$APPINSIGHTS_LOCATION" \
  $FLAGS

"${scripts_path}/deploy-function.sh" --resource-group "$RG" --function-name "$APP_NAME"

if [ "$SKIP_APP_WEBHOOK_UPDATE" != true ]; then
  "${scripts_path}/update-app-webhookurl.sh" --resource-group "$RG" --function-name "$APP_NAME"
fi

if [ "$SET_IP_RESTRICTION" = true ]; then
  echo "Can't check configuration as IP restrictions are set. Skipping check."
else
  echo -e "\nChecking Azure function configuration by calling check config API...."
  checkConfigResult=$(curl -s "https://${APP_NAME}.azurewebsites.net/api/checkConfig" | jq -r '.config')

  if [ "$checkConfigResult" == "OK" ]; then
    echo "  Configuration check passed."
  else 
    echo "  Configuration check failed. Response: $checkConfigResult."  
    exit 1
  fi
fi 
echo -e "\n\nSuccess. Provisioning and deploy complete. You are good to go!!!\n"
