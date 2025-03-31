function validateRequirements()
{
    if ! command -v az &> /dev/null
    then
        echo "Azure CLI not found. You need to install Azure CLI  (see https://aka.ms/azcli)"
        exit
    fi

    if ! command -v jq &> /dev/null
    then
        echo "JQ not found. You need to install JQ (see https://stedolan.github.io/jq)"
        exit
    fi

    if ! command -v curl &> /dev/null
    then
        echo "Curl not found. You need to install Curl (see https://curl.se)"
        exit
    fi
}

function validAzureLogin()
{
    if ! az account show --query id > /dev/null
    then
        echo "You need to login to Azure CLI (see https://aka.ms/azcli)"
        exit
    fi
}

function printSubscription()
{
  local subscription
  subscription=$(az account show --query name --output tsv)
  user=$(az account show --query user.name --output tsv)
  echo -e "Hello $user using Azure Subscription: [$subscription]\n"
}

function get_env_file_path()
{
    local base_path
    base_path=$(get_base_path)
    echo -n "${base_path}/packages/server/.env"
}

function get_base_path()
{  
    local base_path
    base_path=$(cd "$(dirname "$0")/../../.." && pwd)
    echo -n "${base_path}"
}

function validateFunctionName() {

  local input="$1"

  if [ ${#input} -lt 2 ] || [ ${#input} -gt 60 ]; then
    return 1
  fi

  # Regex to check if the string is alphanumeric, allows hyphens but not at the start or end
  if [[ $input =~ ^[a-zA-Z0-9]+([-][a-zA-Z0-9]+)*$ ]]; then
    return 0
  else
    return 1
  fi
}

function loadEnvFile() {

	if [ -z ${SKIP_ENV_FILE+x} ]; then

		env_file=$(get_env_file_path)
		if [ -f "$env_file" ]; then
			echo -e "\nLoading .env file from $env_file"
			source "$env_file"
			if [ -z ${APP_ID+x} ]; then
				echo "Warning: .env file is missing APP_ID Use --app-id to override it"
			fi
			if [ -z ${PRIVATE_KEY+x} ]; then
				echo "Warning: .env file is missing PRIVATE_KEY Use --key to override it"
			fi
			if [ -z ${WEBHOOK_SECRET+x} ]; then
				echo "Warning: .env file is missing WEBHOOK_SECRET Use --webhook-secret to override it"
			fi

			echo ""
		else
			echo -e "Warning .env file not found at $env_file  You will have to pass all parameters GitHub App related parameters manually."	
		fi
	fi

}
