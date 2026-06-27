#!/usr/bin/env node
/**
 * preToolUse: while an sdd-to-tdd execution is ARMED, block the orchestrator
 * from editing implementation/test files directly. Edits are allowed only when
 * a subagent is currently running (depth > 0) — i.e. tdd-red/green/refactor are
 * doing the work, which is the whole point.
 *
 * Fails OPEN: any error or unarmed state returns no opinion ({}) so normal
 * editing is never bricked by this hook.
 */
import {
  readStdinJson,
  writeStdoutJson,
  isArmed,
  getDepth,
  isWriteTool,
  extractPath,
  isProtected,
} from './lib/tdd-guard-policy.mjs';

function main() {
  try {
    if (!isArmed()) {
      writeStdoutJson({});
      return;
    }

    const input = readStdinJson();
    if (!isWriteTool(input.tool_name)) {
      writeStdoutJson({});
      return;
    }

    const path = extractPath(input.tool_input);
    if (!isProtected(path)) {
      writeStdoutJson({});
      return;
    }

    // A subagent is running → it is the authorized writer for this phase.
    if (getDepth() > 0) {
      writeStdoutJson({});
      return;
    }

    // Parent orchestrator is editing a protected path directly → block.
    writeStdoutJson({
      permission: 'deny',
      user_message: `Blocked a direct orchestrator edit to "${path}" during sdd-to-tdd — delegation to a tdd-* subagent is required.`,
      agent_message:
        `sdd-to-tdd delegation guard: you must NOT edit "${path}" directly. ` +
        'Delegate via the Task tool: tdd-red (tests), tdd-green (source), or ' +
        'tdd-refactor (cleanup). If a phase is already underway, ensure it runs ' +
        'as a subagent rather than inline.',
    });
  } catch (err) {
    console.error('[tdd-delegation-guard]', err);
    writeStdoutJson({});
  }
}

main();
