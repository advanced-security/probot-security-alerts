#!/usr/bin/env bash

set -euo pipefail

VERSION=${VERSION:-"3.13"}

if [ "$(id -u)" -ne "0"  ]; then echo "Must be run as root or with sudo"; exit 1; fi
export DEBIAN_FRONTEND=noninteractive

add-apt-repository ppa:deadsnakes/ppa
apt-get update -qq 
apt-get install -y -qq python${VERSION} > /dev/null

# Clean up
apt clean
rm -rf /var/lib/apt/lists/*
