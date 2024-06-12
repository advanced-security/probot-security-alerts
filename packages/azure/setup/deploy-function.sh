#!/bin/env bash

set -euo pipefail

PrintUsage()
{
  COMMAND=${COMMAND_NAME:-$(basename "$0")}

  cat <<EOM
Usage: ${COMMAND} [options]

Options:
    -h, --help                    : Show script help

    --function-name               : Function name. This name needs to be globally unique on Azure 

    -g, --resource-group          : Resource group to provision the resources in (it will be created if it doesn't exist)

Description:

Examples:
  ${COMMAND} 
  ${COMMAND} -g my-probot-security-alerts --function-name my-probot-security-alerts 

EOM
  exit 0
}

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
	
	if [ -z ${RG+x} ]; then
		echo "Resource Group is required"
		missing_params=true
	fi

	if [ -z ${APP_NAME+x} ]; then
		echo "Function App Name is required (must be globally unique)"
		missing_params=true
	fi

	# fail if there are missing parameters
	if [ "$missing_params" = true ]; then
		echo -e "\nMissing or invalid parameters (list above).\n"
		PrintUsage
	fi
}


# get base directory
scripts_path=$(dirname "$0")
source "${scripts_path}/_common.sh"
base_path=$(get_base_path)

azure_base_path="${base_path}/packages/azure"

########### BEGIN
validateRequirements
validateParameters
validAzureLogin

printSubscription

echo -e "\nBuilding and packaging code in $azure_base_path\n"

# Build Code
cd "$azure_base_path" && yarn run build:package

# deploy code
package_zip="${azure_base_path}/publish/package.zip"
echo -e "\nDeploying code from [$package_zip] to [$APP_NAME] in RG [$RG]\n"

az functionapp deployment source config-zip --resource-group "$RG" --name "$APP_NAME"  --src "$package_zip"

echo -e "\nSuccess: Code deployed successfully\n"

echo -e "Tips:"
echo -e "  - To view the function app default hostname, run the following command:"
echo -e "    az functionapp show --name \"$APP_NAME\" --resource-group \"$RG\" --query 'defaultHostName' -o tsv"
echo -e "  - To view the function app logs, run the following command:"
echo -e "    az webapp log tail --name \"$APP_NAME\" --resource-group \"$RG\""

