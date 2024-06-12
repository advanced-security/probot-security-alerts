#!/bin/env bash

set -euo pipefail

PrintUsage()
{
  COMMAND=${COMMAND_NAME:-$(basename "$0")}

  cat <<EOM
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

    -g, --resource-group          : Resource group to provision the resources in (it will be created if it doesn't exist)

    -l --location                 : Location to provision the resources in (default: [$LOCATION])

    --app-insights-location       : Location to provision application insights (default: [$APPINSIGHTS_LOCATION])

    --set-ip-restrictions         : (flag) Set IP restrictions on the function app to only allow traffic from the GitHub hook IP addresses.
                                    Fetches the values automatically from GitHub Meta API (default: false)

Description:

Examples:
  ${COMMAND} -a 123 -k certificate.pem -g deployhours-gate --set-ip-restrictions
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

# get base directory and read env file
scripts_path=$(dirname "$0")
source "${scripts_path}/_common.sh"
base_path=$(get_base_path)
env_file=$(get_env_file_path)

if [ -z ${SKIP_ENV_FILE+x} ]; then
  if [ -f "$env_file" ]; then
    echo -e "\nLoading .env file from $env_file\n"
    source "$env_file"
  else
    echo -e "Warning .env file not found at $env_file  You will have to pass all parameters GitHub App related parameters manually."	
  fi
fi

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
		echo "GitHub Application ID is required"
		missing_params=true
	fi
  
	if [ -z ${PRIVATE_KEY+x} ]; then
		echo "Private Key is required"
		missing_params=true
	fi

	if [ -z ${WEBHOOK_SECRET+x} ]; then
		echo "WebHook Secret is required"
		missing_params=true
	fi

	if [ -z ${RG+x} ]; then
		echo "Resource Group is required"
		missing_params=true
	fi

	if [ -z ${LOCATION+x} ]; then
		echo "Location is required"
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
		echo "Function App Short Name is required"
		missing_params=true
	fi

	# fail if there are missing parameters
	if [ "$missing_params" = true ]; then
		echo -e "\nMissing or invalid parameters (list above).\n"
		PrintUsage
	fi
}

############# Begin
validateParameters
validateRequirements
validAzureLogin

printSubscription

echo -e "Checking if [$RG] resource group exists"
if az group show --name "$RG" --query id --output tsv &> /dev/null ; then
	echo -e "  Exists, will use it."
else
	echo -e "  Doesn't exist. Will create"
  az group create --name "$RG" --location "$LOCATION" --only-show-errors --output none
	echo -e "  Resource Group [$RG] created in $LOCATION"
fi

echo -e "\nParameters:"
echo -e "  Function App Name:\t\t\t $APP_NAME"
echo -e "  Function App Short Name:\t\t $APP_SHORT_NAME"
echo -e "  App Insights Location:\t\t $APPINSIGHTS_LOCATION"
echo -e "  GitHub Application ID:\t\t $APP_ID"
if [ -n "$PRIVATE_KEY" ]; then
	echo -e "  GitHub Application Private Key:\t [redacted]"
fi
if [ -n "$WEBHOOK_SECRET" ]; then
	echo -e "  WebHook Secret:\t\t\t [redacted]"
fi

echo -e "  Set IP Restrictions:\t\t $SET_IP_RESTRICTION"

echo ""
hooksIps="[]"
if [ "$SET_IP_RESTRICTION" == true ]; then  
  hooksIps=$(gh api meta | jq -c .hooks)
  echo -e "  Setting IP restriction to $hooksIps"
else 
  echo -e "  Not setting IP restriction"
fi

echo -e "\nProvisioning Azure Resources in resource group [$RG]\n"
deployOutput=$(az deployment group create --resource-group "$RG" \
    --template-file "${base_path}/packages/azure/iac/function.bicep" \
    --query properties.outputs \
    --parameters appName="$APP_NAME" \
        appShortName="$APP_SHORT_NAME" \
        webHookSecret="$WEBHOOK_SECRET" \
				githubAppId="$APP_ID" \
				certificate="$PRIVATE_KEY" \
        ghHooksIpAddresses="$hooksIps" \
				appInsightsLocation="$APPINSIGHTS_LOCATION" \
    --query 'properties.outputs')

echo 'Deployment Outputs:'
echo "$deployOutput"

echo -e "\nAzure Resources provisioned successfully\n"

# check if SKIP_TIPS is true
if [ -z ${SKIP_TIPS+x} ]; then
  echo -e "If you want to deploy the function code, run the following command:\n"
  echo -e "  ./deploy-function.sh --resource-group \"$RG\" --function-name \"$APP_NAME\"\n"
  echo -e "Note: Don't forget to update the GitHub Application webhook url"
fi

