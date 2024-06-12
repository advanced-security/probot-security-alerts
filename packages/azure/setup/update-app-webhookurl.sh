#!/bin/env bash

set -euo pipefail

PrintUsage()
{
  COMMAND=${COMMAND_NAME:-$(basename "$0")}

  cat <<EOM

Updates the GitHub application configuration with the Function App URL

Usage: ${COMMAND} [options]

Options:
    -h, --help                    : Show script help

    -a, --app-id                  : GitHub application ID

    --function-name               : Function name. This name needs to be globally unique on Azure
 
    -k, --private-key             : Private key for the GitHub application (PEM format)

    -g, --resource-group          : Resource group to provision the resources in (it will be created if it doesn't exist)

Note: If you have configured the GitHub application already the application id, private key will be automatically fetched 
from the .env file

Description:

Examples:
  ${COMMAND} -g my-probot-security-alerts --function-name my-probot-security-alerts
  ${COMMAND} --app-id 123 --key \$KEY_CONTENT -g my-probot-security-alerts --function-name my-probot-security-alerts

EOM
  exit 0
}

# get base directory and read env file
scripts_path=$(dirname "$0")
source "${scripts_path}/_common.sh"
base_path=$(get_base_path)
env_file=$(get_env_file_path)

# Check if SKIP_ENV_FILE is true
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
    -a|--app-id)
      APP_ID=$2
      shift 2
      ;;
    -k|--key)
      PRIVATE_KEY=$2
      shift 2
      ;;
    --function-name)
      APP_NAME=$2
      shift 2
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

	if [ -z ${RG+x} ]; then
		echo "Resource Group is a required parameter. Use --resource-group or -g to specify it"
		missing_params=true
	fi

	if [ -z ${APP_NAME+x} ]; then
		echo "Function App Name is a required parameter (must be globally unique). Use --function-name to specify it"
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

printSubscription

function_hostname=$(az functionapp show --name "$APP_NAME" --resource-group "$RG" --query "defaultHostName" -o tsv)
webhook_url="https://${function_hostname}/api/securityWatcher"

echo "Updating GitHub App Webhook URL to $webhook_url"

APP_ID=$APP_ID PRIVATE_KEY=$PRIVATE_KEY yarn node ${base_path}/scripts/updateAppWebHookUrl.mjs "$webhook_url"
