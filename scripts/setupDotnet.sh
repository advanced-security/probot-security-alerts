#!/usr/bin/env bash

set -euo pipefail

cd /tmp
if [ ! -f ./dotnet-install.sh ]; then
  wget https://dot.net/v1/dotnet-install.sh
  chmod +x dotnet-install.sh
  ./dotnet-install.sh
fi

export DOTNET_ROOT=~/.dotnet
export PATH=$PATH:$DOTNET_ROOT:$DOTNET_ROOT/tools

if [ ! -d azure-functions-core-tools ]; then
	git clone https://github.com/Azure/azure-functions-core-tools
fi
cd azure-functions-core-tools/src/Azure.Functions.Cli/
git checkout 4.0.5700
rm -rf /tmp/tools &> /dev/null || true
dotnet publish Azure.Functions.Cli.csproj -r linux-arm64 -c Release /p:PublishSingleFile=true /p:UseAppHost=true --self-contained=true -o /tmp/tools
