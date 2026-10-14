import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const DEFAULT_ROOT = join(HERE, "..", "..", "..")

const ROUTING_MODES = new Set(["versionKey", "namedProjects"])
const MIGRATION_MODES = new Set(["validate-only", "auto-apply-on-staging-push"])
const MORNING_MODES = new Set(["activate", "report-only"])
const MISSING_REVIEW_MODES = new Set(["block", "ready_no_coderabbit_review"])
const STATUS_WRITES = new Set(["comment-only", "github-automation"])

export function defaultHarnessConfig(manifest = null) {
  return {
    schemaVersion: 1,
    harnessVersion: manifest?.harnessVersion || "0.3.2",
    initialized: false,
    project: { name: null, repository: null },
    template: manifest
      ? {
          repository: manifest.template.repository,
          ref: manifest.template.ref,
          example: manifest.template.example,
          generator: `${manifest.template.package}@${manifest.template.version}`,
        }
      : {
          repository: "https://github.com/vercel/next.js",
          ref: "v16.3.5",
          example: "examples/with-supabase",
          generator: "create-next-app@16.3.5",
        },
    runtime: {
      nodeMinimum: manifest?.nodeMinimum || "22.22.0",
      pnpmVersion: manifest?.pnpmVersion || "10.34.5",
    },
    packageManager: "pnpm",
    commands: {
      lint: "pnpm lint",
      typecheck: "pnpm typecheck",
      unit: "pnpm test:unit",
      integration: "pnpm test:integration",
      e2e: "pnpm test:e2e",
      build: "pnpm build",
      harness: "pnpm test:harness",
    },
    git: {
      defaultBranch: "main",
      accumulatorBranch: "staging",
      prBase: "staging",
      featurePrefix: "sdd/",
      cloudHeadPattern: "cursor/<slug>-<4 hex>",
    },
    linear: {
      teamKey: "",
      issuePrefix: "",
      routingMode: "versionKey",
      versionKeyPattern: "V-X.X",
      namedProjects: [],
      conductorAllowlist: [],
      excludedMilestones: [],
      excludedLabels: [],
      statusWrites: "comment-only",
    },
    supabase: {
      guardedProjectRefs: [],
      migrations: "validate-only",
      localReset: true,
    },
    conductor: {
      file: ".cursor/conductor.json",
      enabled: false,
      morningMode: "activate",
    },
    p0Surfaces: [],
    coderabbit: {
      enabled: true,
      teamKey: "",
      baseBranches: ["staging"],
      drafts: true,
      pauseAfterReviewedCommits: 20,
      requestChangesWorkflow: true,
      missingReview: "ready_no_coderabbit_review",
      specRoot: "docs/specs",
    },
    prAuthoring: {
      mode: "service-account-automation",
      botLogin: "cursor[bot]",
    },
    docs: {
      root: "docs",
      okfVersion: "0.2",
      specsRoot: "docs/specs",
      runbooksRoot: "docs/runbooks",
      findingsRoot: "docs/findings",
    },
    dispatch: {
      minimumActive: 1,
      maximumActive: 3,
    },
    integrations: {
      linear: { enabled: false },
      coderabbit: { enabled: false },
    },
  }
}

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {}
}

function asString(value, fallback = "") {
  return typeof value === "string" ? value : fallback
}

function asBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback
}

function asStringArray(value) {
  return Array.isArray(value) ? value.filter((item) => typeof item === "string") : []
}

export function mergeHarnessConfig(raw = {}, manifest = null) {
  const base = defaultHarnessConfig(manifest)
  const project = asObject(raw.project)
  const git = asObject(raw.git)
  const linear = asObject(raw.linear)
  const supabase = asObject(raw.supabase)
  const conductor = asObject(raw.conductor)
  const coderabbit = asObject(raw.coderabbit)
  const prAuthoring = asObject(raw.prAuthoring)
  const docs = asObject(raw.docs)
  const dispatch = asObject(raw.dispatch)
  const integrations = asObject(raw.integrations)
  return {
    ...base,
    ...raw,
    project: {
      ...base.project,
      ...project,
      name: Object.hasOwn(project, "name") ? project.name : base.project.name,
    },
    template: { ...base.template, ...asObject(raw.template) },
    runtime: { ...base.runtime, ...asObject(raw.runtime) },
    commands: { ...base.commands, ...asObject(raw.commands) },
    git: { ...base.git, ...git },
    linear: {
      ...base.linear,
      ...linear,
      namedProjects: asStringArray(linear.namedProjects ?? base.linear.namedProjects),
      conductorAllowlist: asStringArray(
        linear.conductorAllowlist ?? base.linear.conductorAllowlist,
      ),
      excludedMilestones: asStringArray(
        linear.excludedMilestones ?? base.linear.excludedMilestones,
      ),
      excludedLabels: asStringArray(linear.excludedLabels ?? base.linear.excludedLabels),
    },
    supabase: {
      ...base.supabase,
      ...supabase,
      guardedProjectRefs: asStringArray(
        supabase.guardedProjectRefs ?? base.supabase.guardedProjectRefs,
      ),
    },
    conductor: { ...base.conductor, ...conductor },
    p0Surfaces: asStringArray(raw.p0Surfaces ?? base.p0Surfaces),
    coderabbit: {
      ...base.coderabbit,
      ...coderabbit,
      baseBranches: asStringArray(coderabbit.baseBranches ?? base.coderabbit.baseBranches),
    },
    prAuthoring: { ...base.prAuthoring, ...prAuthoring },
    docs: { ...base.docs, ...docs },
    dispatch: { ...base.dispatch, ...dispatch },
    integrations: {
      linear: {
        enabled: asBoolean(asObject(integrations.linear).enabled, false),
        ...asObject(integrations.linear),
      },
      coderabbit: {
        enabled: asBoolean(asObject(integrations.coderabbit).enabled, false),
        ...asObject(integrations.coderabbit),
      },
    },
  }
}

export function loadHarnessConfig(root = DEFAULT_ROOT) {
  const configPath = join(root, ".cursor", "harness.json")
  const raw = JSON.parse(readFileSync(configPath, "utf8"))
  const manifestPath = join(root, ".cursor", "bootstrap", "manifest.json")
  const manifest = existsSync(manifestPath)
    ? JSON.parse(readFileSync(manifestPath, "utf8"))
    : null
  const config = mergeHarnessConfig(raw, manifest)
  const conductorPath = join(root, config.conductor.file || ".cursor/conductor.json")
  if (existsSync(conductorPath)) {
    const parked = JSON.parse(readFileSync(conductorPath, "utf8"))
    config.conductor = {
      ...config.conductor,
      enabled: asBoolean(parked.enabled, config.conductor.enabled),
      morningMode: asString(parked.morningMode, config.conductor.morningMode),
      allowlistedProjects: asStringArray(parked.allowlistedProjects),
      excludedMilestones: asStringArray(
        parked.excludedMilestones ?? config.linear.excludedMilestones,
      ),
      excludedLabels: asStringArray(parked.excludedLabels ?? config.linear.excludedLabels),
    }
  }
  return config
}

export function linearTeamKey(config) {
  return asString(config?.linear?.teamKey).trim().toUpperCase()
}

export function issueIdPattern(config) {
  const prefix = asString(config?.linear?.issuePrefix).trim() || linearTeamKey(config)
  return prefix ? `${prefix}-###` : "<issue-id>"
}

export function dailyQueueBounds(config) {
  const minimum = Number(config?.dispatch?.minimumActive)
  const maximum = Number(config?.dispatch?.maximumActive)
  return {
    minimum: Number.isSafeInteger(minimum) ? minimum : 1,
    maximum: Number.isSafeInteger(maximum) ? maximum : 3,
  }
}

export function validateHarnessConfig(config) {
  const violations = []
  if (config.schemaVersion !== 1) violations.push("schemaVersion must be 1")
  if (!asString(config.git?.defaultBranch)) violations.push("git.defaultBranch is required")
  if (!asString(config.git?.accumulatorBranch)) {
    violations.push("git.accumulatorBranch is required")
  }
  if (!asString(config.git?.prBase)) violations.push("git.prBase is required")
  if (!asString(config.git?.featurePrefix)) violations.push("git.featurePrefix is required")
  if (!asString(config.git?.cloudHeadPattern)) {
    violations.push("git.cloudHeadPattern is required")
  }
  if (!ROUTING_MODES.has(config.linear?.routingMode)) {
    violations.push("linear.routingMode must be versionKey or namedProjects")
  }
  if (!STATUS_WRITES.has(config.linear?.statusWrites)) {
    violations.push("linear.statusWrites must be comment-only or github-automation")
  }
  if (!MIGRATION_MODES.has(config.supabase?.migrations)) {
    violations.push("supabase.migrations must be validate-only or auto-apply-on-staging-push")
  }
  if (!MORNING_MODES.has(config.conductor?.morningMode)) {
    violations.push("conductor.morningMode must be activate or report-only")
  }
  if (config.conductor?.file !== ".cursor/conductor.json") {
    violations.push("conductor.file must remain .cursor/conductor.json")
  }
  if (!MISSING_REVIEW_MODES.has(config.coderabbit?.missingReview)) {
    violations.push("coderabbit.missingReview must be block or ready_no_coderabbit_review")
  }
  if (config.prAuthoring?.botLogin !== "cursor[bot]") {
    violations.push("prAuthoring.botLogin must be cursor[bot]")
  }
  if (config.runtime?.nodeMinimum !== "22.22.0") {
    violations.push("runtime.nodeMinimum must be 22.22.0")
  }
  const { minimumActive, maximumActive } = config.dispatch || {}
  if (
    !Number.isSafeInteger(minimumActive) ||
    !Number.isSafeInteger(maximumActive) ||
    minimumActive < 1 ||
    maximumActive < minimumActive
  ) {
    violations.push("dispatch bounds must be positive integers with minimum <= maximum")
  }
  return violations
}
