#!/usr/bin/env bash

set -euo pipefail

if [ "$(id -u)" -ne "0"  ]; then echo "Must be run as root or with sudo"; exit 1; fi

PROCESSOR_ARCHITECTURE=$(uname -m)
if [ "${PROCESSOR_ARCHITECTURE}" == "arm64" ] || [ "${PROCESSOR_ARCHITECTURE}" == "aarch64" ]; then
    declare -r PLATFORM=arm64
else
    declare -r PLATFORM=x86_64
fi

echo " ********* Installing AWS SAM CLI ********* "
if ! command -v sam &> /dev/null; then
    rm -rf /tmp/sam >/dev/null
    curl -SLfo /tmp/sam-cli.zip https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-${PLATFORM}.zip
    unzip -qq /tmp/sam-cli.zip -d /tmp/sam
    sudo /tmp/sam/install
    rm -rf /tmp/sam-cli
    rm /tmp/sam-cli.zip
fi
