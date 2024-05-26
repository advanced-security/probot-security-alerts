#!/usr/bin/env bash

set -euo pipefail

if [ "$(id -u)" -ne "0"  ]; then echo "Must be run as root or with sudo"; exit 1; fi
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq 
apt-get install -y -qq apt-transport-https ca-certificates curl tar unzip > /dev/null

# Clean up
apt clean
rm -rf /var/lib/apt/lists/*
