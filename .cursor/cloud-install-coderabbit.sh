#!/bin/sh
# Idempotent CodeRabbit CLI install for Cursor Cloud (Linux).
# Pin: CodeRabbit CLI 0.9.0 (no leading v). The official installer can pin
# 0.9.0, but this script uses only the pinned linux-x64 zip plus published
# SHA-256 so /push and tests stay installer-free. Authenticate US Team only
# via the CODERABBIT_API_KEY Cursor secret — never commit the key.
# Missing key, failed login, or non-US status fail setup.
set -eu

PINNED_VERSION="0.9.0"
# linux-x64 zip hash from https://cli.coderabbit.ai/releases/0.9.0/SHA256SUMS
PINNED_LINUX_X64_SHA256="56e4c99de9d11106c3e6bf31034864db8f746cb97c9eaf9470adcfa6461da66f"
BIN_DIR="${HOME}/.local/bin"
export PATH="${BIN_DIR}:${PATH}"
CI=1
export CI
CODERABBIT_VERSION="${PINNED_VERSION}"
export CODERABBIT_VERSION

if [ -z "${CODERABBIT_API_KEY:-}" ]; then
  echo "cloud-install-coderabbit: CODERABBIT_API_KEY is required (US Agentic key from https://app.coderabbit.ai/settings/api-keys). Store it as a Cursor Cloud secret named CODERABBIT_API_KEY, then re-run: corepack enable && corepack prepare --activate && pnpm install --frozen-lockfile && sh .cursor/cloud-install-coderabbit.sh" >&2
  exit 1
fi

installed_version() {
  if command -v coderabbit >/dev/null 2>&1; then
    coderabbit --version 2>/dev/null | tr -d '[:space:]' | sed 's/^v//'
  else
    printf '%s\n' ""
  fi
}

install_from_zip() {
  work="$(mktemp -d)"
  zip="${work}/coderabbit-linux-x64.zip"
  curl -fsSL "https://cli.coderabbit.ai/releases/${PINNED_VERSION}/coderabbit-linux-x64.zip" -o "${zip}"
  echo "${PINNED_LINUX_X64_SHA256}  ${zip}" | sha256sum -c -
  unzip -o "${zip}" -d "${work}"
  mkdir -p "${BIN_DIR}"
  install -m 0755 "${work}/coderabbit" "${BIN_DIR}/coderabbit"
  ln -sfn "${BIN_DIR}/coderabbit" "${BIN_DIR}/cr"
  rm -rf "${work}"
}

current="$(installed_version)"
if [ "${current}" != "${PINNED_VERSION}" ]; then
  # Restaurant pin is 0.9.0. Use the pinned zip plus published SHA-256 only.
  install_from_zip
  export PATH="${BIN_DIR}:${PATH}"
  current="$(installed_version)"
fi

if [ "${current}" != "${PINNED_VERSION}" ]; then
  echo "cloud-install-coderabbit: expected CLI ${PINNED_VERSION}, got '${current}'. Reinstall with CODERABBIT_VERSION=${PINNED_VERSION}." >&2
  exit 1
fi

line='export PATH="$HOME/.local/bin:$PATH"'
profile="${HOME}/.profile"
if [ -f "${profile}" ]; then
  grep -Fqx "${line}" "${profile}" || echo "${line}" >>"${profile}"
else
  echo "${line}" >>"${profile}"
fi

coderabbit auth login --region us --api-key "${CODERABBIT_API_KEY}"

status_json="$(coderabbit auth status --agent)"
printf '%s\n' "${status_json}"

printf '%s\n' "${status_json}" | grep -Eq '"authenticated":[[:space:]]*true' || {
  echo "cloud-install-coderabbit: auth status is not authenticated. Recovery: coderabbit auth login --region us --api-key \"\$CODERABBIT_API_KEY\"; coderabbit auth status --agent" >&2
  exit 1
}

printf '%s\n' "${status_json}" | grep -Eq '"region":[[:space:]]*"us"' || {
  echo "cloud-install-coderabbit: auth region is not us. Recovery: coderabbit auth login --region us --api-key \"\$CODERABBIT_API_KEY\"; coderabbit auth status --agent" >&2
  exit 1
}

coderabbit --version
