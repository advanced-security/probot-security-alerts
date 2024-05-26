#!/usr/bin/env bash

set -euo pipefail

if [ "$(id -u)" -ne "0"  ]; then echo "Must be run as root or with sudo"; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
UPDATE_RC=${UPDATE_RC:-"true"}
AZURE_FUNC_TOOLS_DIR=${AZURE_FUNC_TOOLS_DIR:-"/usr/local/functools"}
USERNAME=${USERNAME:-"automatic"}

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
rm -f /etc/profile.d/00-func-restore-env.sh
echo "export PATH=${PATH//$(sh -lc 'echo $PATH')/\$PATH}" > /etc/profile.d/00-func-restore-env.sh
chmod +x /etc/profile.d/00-func-restore-env.sh

# Determine the appropriate non-root user
if [ "${USERNAME}" = "auto" ] || [ "${USERNAME}" = "automatic" ]; then
    USERNAME=""
    POSSIBLE_USERS=("vscode" "node" "codespace" "$(awk -v val=1000 -F ":" '$3==val{print $1}' /etc/passwd)")
    for CURRENT_USER in "${POSSIBLE_USERS[@]}"; do
        if id -u "${CURRENT_USER}" > /dev/null 2>&1; then
            USERNAME="${CURRENT_USER}"
            break
        fi
    done
    if [ "${USERNAME}" = "" ]; then
        USERNAME=root
    fi
elif [ "${USERNAME}" = "none" ] || ! id -u ${USERNAME} > /dev/null 2>&1; then
    USERNAME=root
fi

PROCESSOR_ARCHITECTURE=$(uname -m)
if [ "${PROCESSOR_ARCHITECTURE}" == "arm64" ] || [ "${PROCESSOR_ARCHITECTURE}" == "aarch64" ]; then
    declare -r PLATFORM=arm64
else
    declare -r PLATFORM=amd64
fi

if [ "${PLATFORM}" == "arm64" ]; then
    FXN_BUILD_ROOT_DIR=/tmp
    # [ -d "${FXN_BUILD_ROOT_DIR}" ] || mkdir -p "${FXN_BUILD_ROOT_DIR}"
    cd "${FXN_BUILD_ROOT_DIR}"
	if [ ! -d azure-functions-core-tools ]; then
		git clone --depth 1 https://github.com/Azure/azure-functions-core-tools
	fi
	chown -R "${USERNAME}":"${USERNAME}" azure-functions-core-tools
	cd azure-functions-core-tools/src/Azure.Functions.Cli/
	#git checkout 4.0.5801
	${DOTNET_ROOT}/dotnet publish -r linux-arm64 -c Release -f net8.0 --self-contained=true
	mkdir -p "${AZURE_FUNC_TOOLS_DIR}"
	mv bin/Release/net8.0/linux-arm64/publish/* "${AZURE_FUNC_TOOLS_DIR}"
	rm -rf "${FXN_BUILD_ROOT_DIR}/azure-functions-core-tools"
	updaterc "export AZURE_FUNC_TOOLS_DIR=${AZURE_FUNC_TOOLS_DIR}"
else
  # sudo sh -c 'echo "deb [arch=amd64] https://packages.microsoft.com/repos/microsoft-ubuntu-$(lsb_release -cs)-prod $(lsb_release -cs) main" > /etc/apt/sources.list.d/dotnetdev.list'
	sudo apt-get update
	sudo apt-get install -y azure-functions-core-tools-4 dotnet-sdk-8.0
fi
