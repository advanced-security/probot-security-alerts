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
