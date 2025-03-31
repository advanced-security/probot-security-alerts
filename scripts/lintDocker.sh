#!/usr/bin/env bash

set -euo pipefail

function main() {
  declare -r output="${GITHUB_STEP_SUMMARY:-}"
	declare -r matcher="$(getWorkspaceRoot)/scripts/hadolint-matcher.json"
	if [ -n "${output}" ]; then
		echo "::add-matcher::${matcher}"
		echo "### Hadolint" >> $output
	fi
	process ${@}
	if [ -n "${output}" ]; then
		echo "::remove-matcher::${matcher}"
	fi
}

function getWorkspaceRoot() {
	SCRIPT_DIR=$(dirname $(readlink -e "${BASH_SOURCE[0]}")) &> /dev/null
	echo $(dirname $SCRIPT_DIR)
}

function process() {
	declare -r output="${GITHUB_STEP_SUMMARY:-}"
	cd $(getWorkspaceRoot)
  	for f in "${@}"
  	do
			declare filePath=$(readlink -e $f)
			declare summary=$(hadolint $filePath)
  	  declare status="code $?"
			echo $summary
			if [ -n "${output}" ]; then
				declare codeBlock='```'
				summary=$(echo "${summary}" | sed -E "s@${filePath}:([0-9]+)@Line \1:@g")
				cat <<- EOF >> $output
					#### ${f} (${status})
					${codeBlock}
					${summary}
					${codeBlock}
					EOF
			fi
  	done
}

main "$@"
