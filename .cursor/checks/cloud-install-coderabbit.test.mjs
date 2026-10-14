import assert from "node:assert/strict"
import { spawnSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { test } from "node:test"

const ROOT = process.cwd()
const SCRIPT = join(ROOT, ".cursor", "cloud-install-coderabbit.sh")
const DUMMY_KEY = "dummy-agentic-key-DO-NOT-LEAK-1234"

const CODERABBIT_STUB = `#!/bin/sh
state="$STUB_STATE"
case "$1" in
  --version) cat "$state/version" ;;
  auth)
    case "$2" in
      login)
        printf '%s\\n' "$*" >>"$state/calls"
        if [ -n "\${STUB_LOGIN_FAIL:-}" ]; then
          echo "invalid key: $4" >&2
          exit 1
        fi
        ;;
      status)
        printf 'status\\n' >>"$state/calls"
        if [ -n "\${STUB_UNAUTHENTICATED:-}" ]; then
          echo '{"authenticated":false,"region":"us"}'
        else
          printf '{"authenticated":true,"region":"%s"}\\n' "\${STUB_REGION-us}"
        fi
        ;;
    esac
    ;;
esac
`

const CURL_STUB = `#!/bin/sh
printf '%s\\n' "$*" >>"$STUB_STATE/curl-calls"
cat <<'INSTALLER'
printf '%s %s %s\\n' "$CI" "$CR_CLI_SKIP_LOGIN" "$CODERABBIT_VERSION" >"$STUB_STATE/installer-env"
env >"$STUB_STATE/installer-full-env"
printf '0.9.0' >"$STUB_STATE/version"
mkdir -p "$HOME/.local/bin"
cp "$STUB_STATE/coderabbit.stub" "$HOME/.local/bin/coderabbit"
chmod +x "$HOME/.local/bin/coderabbit"
INSTALLER
`

function writeExecutable(path, contents) {
  writeFileSync(path, contents)
  chmodSync(path, 0o755)
}

function runScript({ installedVersion = null, apiKey = null, extraEnv = {} } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "cr-install-"))
  const home = join(dir, "home")
  const state = join(dir, "state")
  const stubBin = join(dir, "bin")
  for (const d of [join(home, ".local", "bin"), state, stubBin]) {
    mkdirSync(d, { recursive: true })
  }
  writeFileSync(join(state, "coderabbit.stub"), CODERABBIT_STUB)
  writeExecutable(join(stubBin, "curl"), CURL_STUB)
  if (installedVersion) {
    writeFileSync(join(state, "version"), installedVersion)
    writeExecutable(join(home, ".local", "bin", "coderabbit"), CODERABBIT_STUB)
  }
  const env = {
    PATH: `${stubBin}:/usr/bin:/bin`,
    HOME: home,
    STUB_STATE: state,
    ...extraEnv,
  }
  if (apiKey) env.CODERABBIT_API_KEY = apiKey
  const result = spawnSync("sh", [SCRIPT], { env, encoding: "utf8" })
  const read = (name) =>
    existsSync(join(state, name)) ? readFileSync(join(state, name), "utf8") : null
  const out = {
    status: result.status,
    stdout: result.stdout,
    stderr: result.stderr,
    curlCalls: read("curl-calls"),
    installerEnv: read("installer-env"),
    installerFullEnv: read("installer-full-env"),
    calls: read("calls"),
  }
  rmSync(dir, { recursive: true, force: true })
  return out
}

test("skips the install when CLI 0.9.0 is already present", () => {
  const r = runScript({ installedVersion: "0.9.0", apiKey: DUMMY_KEY })
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.curlCalls, null, "installer must not be downloaded")
  assert.equal(r.installerEnv, null)
  assert.match(r.stdout, /already installed; skipping install/)
})

test("treats a leading v in the reported version as the pinned version", () => {
  const r = runScript({ installedVersion: "v0.9.0\n", apiKey: DUMMY_KEY })
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.curlCalls, null)
})

test("installs the pinned version via the official installer when another version is present", () => {
  const r = runScript({ installedVersion: "0.7.6", apiKey: DUMMY_KEY })
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.curlCalls.trim(), "-fsSL https://cli.coderabbit.ai/install.sh")
  assert.equal(r.installerEnv.trim(), "1 1 0.9.0")
})

test("the installer never receives CODERABBIT_API_KEY in its environment", () => {
  const r = runScript({ apiKey: DUMMY_KEY })
  assert.equal(r.status, 0, r.stderr)
  assert.ok(r.installerFullEnv, "installer must have run")
  assert.doesNotMatch(r.installerFullEnv, /^CODERABBIT_API_KEY=/m)
  assert.ok(
    !r.installerFullEnv.includes(DUMMY_KEY),
    "installer environment leaked the key",
  )
  assert.match(r.installerFullEnv, /^CODERABBIT_VERSION=0\.9\.0$/m)
})

test("installs when the CLI is missing entirely", () => {
  const r = runScript({ apiKey: DUMMY_KEY })
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.installerEnv.trim(), "1 1 0.9.0")
})

test("fails when the installer does not produce the pinned version", () => {
  const dir = mkdtempSync(join(tmpdir(), "cr-install-bad-"))
  const stubBin = join(dir, "bin")
  mkdirSync(stubBin, { recursive: true })
  writeExecutable(join(stubBin, "curl"), "#!/bin/sh\nexit 22\n")
  const result = spawnSync("sh", [SCRIPT], {
    env: { PATH: `${stubBin}:/usr/bin:/bin`, HOME: dir },
    encoding: "utf8",
  })
  rmSync(dir, { recursive: true, force: true })
  assert.notEqual(result.status, 0)
  assert.match(result.stderr, /expected CLI 0\.9\.0/)
})

test("a missing CODERABBIT_API_KEY prints a warning and exits 0 without logging in", () => {
  const r = runScript({ installedVersion: "0.9.0" })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stderr, /WARNING: CODERABBIT_API_KEY is not set/)
  assert.equal(r.calls, null, "no auth call without a key")
})

test("an empty CODERABBIT_API_KEY is treated as missing", () => {
  const r = runScript({
    installedVersion: "0.9.0",
    extraEnv: { CODERABBIT_API_KEY: "" },
  })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stderr, /WARNING: CODERABBIT_API_KEY is not set/)
  assert.equal(r.calls, null)
})

test("logs in with --api-key from the environment and verifies status without echoing the key", () => {
  const r = runScript({ installedVersion: "0.9.0", apiKey: DUMMY_KEY })
  assert.equal(r.status, 0, r.stderr)
  assert.equal(r.calls.split("\n")[0], `auth login --api-key ${DUMMY_KEY}`)
  assert.match(r.calls, /^status$/m)
  assert.match(r.stdout, /"authenticated":true/)
  assert.ok(!r.stdout.includes(DUMMY_KEY), "stdout leaked the key")
  assert.ok(!r.stderr.includes(DUMMY_KEY), "stderr leaked the key")
})

test("a failed login exits non-zero and never leaks the key from CLI output", () => {
  const r = runScript({
    installedVersion: "0.9.0",
    apiKey: DUMMY_KEY,
    extraEnv: { STUB_LOGIN_FAIL: "1" },
  })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /coderabbit auth login failed/)
  assert.ok(!r.stdout.includes(DUMMY_KEY), "stdout leaked the key")
  assert.ok(!r.stderr.includes(DUMMY_KEY), "stderr leaked the key")
})

test("exits non-zero when status is not authenticated after login", () => {
  const r = runScript({
    installedVersion: "0.9.0",
    apiKey: DUMMY_KEY,
    extraEnv: { STUB_UNAUTHENTICATED: "1" },
  })
  assert.notEqual(r.status, 0)
  assert.match(r.stderr, /not authenticated for the required US region/)
})

test("exits non-zero when the authenticated session is not the US region", () => {
  for (const region of ["eu", ""]) {
    const r = runScript({
      installedVersion: "0.9.0",
      apiKey: DUMMY_KEY,
      extraEnv: { STUB_REGION: region },
    })
    assert.notEqual(r.status, 0, `region '${region}'`)
    assert.match(r.stderr, /not authenticated for the required US region/)
  }
})

test("accepts a US-region status regardless of case", () => {
  const r = runScript({
    installedVersion: "0.9.0",
    apiKey: DUMMY_KEY,
    extraEnv: { STUB_REGION: "US" },
  })
  assert.equal(r.status, 0, r.stderr)
})

test("script and Dockerfile strip the key from the installer environment", () => {
  const script = readFileSync(SCRIPT, "utf8")
  assert.match(script, /\|\s*env -u CODERABBIT_API_KEY CI=1 CR_CLI_SKIP_LOGIN=1/)
  const dockerfile = readFileSync(
    join(ROOT, ".cursor", "cloud.Dockerfile"),
    "utf8",
  )
  assert.match(dockerfile, /install\.sh \| env -u CODERABBIT_API_KEY /)
})

test("script never enables shell tracing and pins the official installer", () => {
  const script = readFileSync(SCRIPT, "utf8")
  assert.doesNotMatch(script, /^\s*set\s+-[a-z]*x/m)
  assert.doesNotMatch(script, /set\s+-o\s+xtrace/)
  assert.match(script, /PINNED_VERSION="0\.9\.0"/)
  assert.match(script, /https:\/\/cli\.coderabbit\.ai\/install\.sh/)
  assert.match(script, /CI=1 CR_CLI_SKIP_LOGIN=1 CODERABBIT_VERSION=/)
})

test("environment.json install runs the setup script after the existing chain", () => {
  const env = JSON.parse(
    readFileSync(join(ROOT, ".cursor", "environment.json"), "utf8"),
  )
  assert.equal(
    env.install,
    "corepack enable && corepack prepare pnpm@10.34.5 --activate && pnpm install --frozen-lockfile && sh .cursor/cloud-install-coderabbit.sh",
  )
})
