/**
 * Shared evaluator for /conduct next transcripts.
 * Credits a criterion only when the Task text names that id.
 * An unlabelled Task credits no criteria.
 */
export const PHASE_AGENTS = {
  "tdd-red": "red",
  "tdd-green": "green",
  "tdd-refactor": "refactor",
}

function emptyPhases() {
  return { red: false, green: false, refactor: false }
}

function extractCriterionIds(text, requiredCriteria) {
  const ids = []
  const hay = String(text || "")
  for (const id of requiredCriteria) {
    if (hay.includes(id)) ids.push(id)
  }
  return ids
}

function subagentFromEvent(event) {
  return (
    event?.subagent ||
    event?.agent ||
    event?.name ||
    event?.tool_input?.subagent_type ||
    event?.tool_input?.description ||
    ""
  )
}

export function evaluateConductorTranscript(
  events,
  { requiredCriteria = [] } = {},
) {
  const criteria = Object.fromEntries(
    requiredCriteria.map((id) => [id, emptyPhases()]),
  )
  let linearResolverTasks = 0
  let parentTrackerWrites = 0
  let deniedInline = false
  for (const event of events || []) {
    const type = event?.type || event?.kind
    if (type === "deny" || event?.denied) deniedInline = true
    if (type === "linear" || event?.via === "linear-resolver") {
      if (event?.via === "parent") parentTrackerWrites += 1
      else linearResolverTasks += 1
      continue
    }
    if (type !== "task" && event?.tool !== "Task") continue
    const subagent = String(subagentFromEvent(event))
    if (subagent === "linear-resolver") {
      linearResolverTasks += 1
      continue
    }
    const phase = PHASE_AGENTS[subagent]
    if (!phase) continue
    const ids = extractCriterionIds(
      event?.text || event?.prompt || event?.tool_input?.prompt || "",
      requiredCriteria,
    )
    for (const id of ids) {
      if (!criteria[id]) criteria[id] = emptyPhases()
      criteria[id][phase] = true
    }
  }
  const missing = []
  for (const [id, phases] of Object.entries(criteria)) {
    for (const phase of ["red", "green", "refactor"]) {
      if (!phases[phase]) missing.push(`${id}:${phase}`)
    }
  }
  return {
    ok: missing.length === 0 && parentTrackerWrites === 0,
    missing,
    linearResolverTasks,
    parentTrackerWrites,
    deniedInline,
  }
}
