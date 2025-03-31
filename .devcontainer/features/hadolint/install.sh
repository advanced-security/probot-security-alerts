#!/usr/bin/env bash

set -euo pipefail

if [ "$(id -u)" -ne "0"  ]; then echo "Must be run as root or with sudo"; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
PROCESSOR_ARCHITECTURE=$(uname -m)
if [ "${PROCESSOR_ARCHITECTURE}" == "arm64" ] || [ "${PROCESSOR_ARCHITECTURE}" == "aarch64" ]; then
    declare -r PLATFORM=arm64
else
    declare -r PLATFORM=x86_64
fi

declare -r HADOLINT_VERSION=$(curl -s https://api.github.com/repos/hadolint/hadolint/releases/latest | grep '"tag_name":' | sed -E 's/[^:]+:\ \"v([^\"]+).+/\1/')
echo " ******* Installing Hadolint v${HADOLINT_VERSION} (${PLATFORM}) ******* "
declare -r filepath="/usr/local/bin/hadolint"
if ! [ -f filepath ]; then
  curl --no-progress-meter -sSLfo $filepath https://github.com/hadolint/hadolint/releases/download/v${HADOLINT_VERSION}/hadolint-Linux-${PLATFORM}
  chmod +x $filepath
fi
