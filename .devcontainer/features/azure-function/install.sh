#!/usr/bin/env bash

set -euo pipefail

if [ "$(id -u)" -ne "0"  ]; then echo "Must be run as root or with sudo"; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
UPDATE_RC=${UPDATE_RC:-"true"}
AZURE_FUNC_TOOLS_DIR=${AZURE_FUNC_TOOLS_DIR:-"/lib/azure-functions-core-tools-4"}
USERNAME=${USERNAME:-"automatic"}
VERSION=${VERSION:-"latest"}
TARGET_SDK=net8.0

updaterc() {
    if [ "${UPDATE_RC}" = "true" ]; then
        echo "Updating /etc/bash.bashrc and /etc/zsh/zshrc..."
        if [[ "$(cat /etc/bash.bashrc)" != *"$1"* ]]; then
            echo -e "$1" >> /etc/bash.bashrc
        fi
        if [ -f "/etc/zsh/zshrc" ] && [[ "$(cat /etc/zsh/zshrc)" != *"$1"* ]]; then
            echo -e "$1" >> /etc/zsh/zshrc
        fi
    fi
}

# Ensure that login shells get the correct path if the user updated the PATH using ENV.
rm -f /etc/profile.d/00-restore-env.sh
echo "export PATH=${PATH//$(sh -lc 'echo $PATH')/\$PATH}" > /etc/profile.d/00-restore-env.sh
chmod +x /etc/profile.d/00-restore-env.sh

PROCESSOR_ARCHITECTURE=$(uname -m)
if [ "${PROCESSOR_ARCHITECTURE}" == "arm64" ] || [ "${PROCESSOR_ARCHITECTURE}" == "aarch64" ]; then
    declare -r PLATFORM=arm64
    declare -r RID_PLATFORM=arm64
else
    declare -r PLATFORM=amd64
    declare -r RID_PLATFORM=x64
fi

if [ "${PLATFORM}" == "arm64" ] || [ "${VERSION}" != "latest" ]; then
  ## Create a temporary space 
  FXN_BUILD_ROOT_DIR=`mktemp -d`
  cd "${FXN_BUILD_ROOT_DIR}"
	
  ## Identify the correct version of the code
	if [ "${VERSION}" == "latest" ]; then
		BRANCH=v4.x
	else
	  BRANCH=${VERSION}

		## Older versions relied on net6.0
		if [ "${VERSION:0:3}" == "4.0" ] && [ ${VERSION:4} -lt 5802 ]; then
			TARGET_SDK=net6.0
		fi
	fi

	## Download the source code for the requested version (branch/tag)
	git clone --depth 1 --branch "${BRANCH}" https://github.com/Azure/azure-functions-core-tools
	
  ## Build the project
  cd azure-functions-core-tools/src/Azure.Functions.Cli/
	${DOTNET_ROOT}/dotnet publish -r "linux-${RID_PLATFORM}" -c Release -f "${TARGET_SDK}" --self-contained=true
    
  ## Clear the nuget caches to reduce the image size several from 17GB to 6GB
  ${DOTNET_ROOT}/dotnet nuget locals all --clear

  ## Copy the binaries for the tool
	[ -d "${AZURE_FUNC_TOOLS_DIR}" ] && rm -rf "${AZURE_FUNC_TOOLS_DIR}"
  mkdir -p "${AZURE_FUNC_TOOLS_DIR}"
	mv bin/Release/${TARGET_SDK}/linux-${RID_PLATFORM}/publish/* "${AZURE_FUNC_TOOLS_DIR}"

  ## Cleanup the source code/build
	rm -rf "${FXN_BUILD_ROOT_DIR}"

  ## Update the environment variable
	updaterc "export AZURE_FUNC_TOOLS_DIR=${AZURE_FUNC_TOOLS_DIR}"
else
	sudo apt-get update
	sudo apt-get install -y azure-functions-core-tools-4
fi
