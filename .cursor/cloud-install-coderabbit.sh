#!/bin/sh
# Idempotent CodeRabbit CLI install + login for Cursor Cloud (Linux).
# Pin: CLI 0.9.0 via the official installer (`coderabbit --version` prints
# `0.9.0`, no leading v). The key comes only from the CODERABBIT_API_KEY
# environment secret; it is never typed, logged, or echoed. Never enable
# shell tracing here: it would print the key.
set -eu

PINNED_VERSION="0.9.0"
INSTALLER_URL="https://cli.coderabbit.ai/install.sh"
BIN_DIR="${CODERABBIT_INSTALL_DIR:-${HOME}/.local/bin}"
PATH="${BIN_DIR}:${PATH}"
export PATH

installed_version() {
  if command -v coderabbit >/dev/null 2>&1; then
    coderabbit --version 2>/dev/null | tr -d '[:space:]' | sed 's/^v//'
  else
    printf '%s\n' ""
  fi
}

current="$(installed_version)"
if [ "${current}" = "${PINNED_VERSION}" ]; then
  echo "cloud-install-coderabbit: CodeRabbit CLI ${PINNED_VERSION} already installed; skipping install."
else
  # The remote installer never needs the key, so it is removed from its environment.
  curl -fsSL "${INSTALLER_URL}" | env -u CODERABBIT_API_KEY CI=1 CR_CLI_SKIP_LOGIN=1 CODERABBIT_VERSION="${PINNED_VERSION}" sh
  current="$(installed_version)"
fi

if [ "${current}" != "${PINNED_VERSION}" ]; then
  echo "cloud-install-coderabbit: expected CLI ${PINNED_VERSION}, got '${current}'." >&2
  exit 1
fi

if [ -z "${CODERABBIT_API_KEY:-}" ]; then
  echo "cloud-install-coderabbit: WARNING: CODERABBIT_API_KEY is not set; skipping CodeRabbit login. The CodeRabbit gate will report unavailable at review time. Add an Agentic API key as a Cursor Cloud secret named CODERABBIT_API_KEY." >&2
  coderabbit --version
  exit 0
fi

# Login output is suppressed so a CLI error can never echo the key.
if ! coderabbit auth login --api-key "${CODERABBIT_API_KEY}" >/dev/null 2>&1; then
  echo "cloud-install-coderabbit: coderabbit auth login failed (output suppressed). Check that CODERABBIT_API_KEY is a valid Agentic API key, then rerun: sh .cursor/cloud-install-coderabbit.sh" >&2
  exit 1
fi

coderabbit --version
status_json="$(coderabbit auth status --agent)"
printf '%s\n' "${status_json}"

if ! printf '%s\n' "${status_json}" | grep -Eq '"authenticated":[[:space:]]*true' ||
  ! printf '%s\n' "${status_json}" | grep -Eiq '"region":[[:space:]]*"us"'; then
  echo "cloud-install-coderabbit: auth status is not authenticated for the required US region." >&2
  exit 1
fi
