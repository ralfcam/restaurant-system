#!/usr/bin/env node
/**
 * CLI control for the sdd-to-tdd delegation guard. Run via the Shell tool:
 *   node .cursor/hooks/tdd-guard.mjs on      → arm (orchestrator's first exec action)
 *   node .cursor/hooks/tdd-guard.mjs off     → disarm (orchestrator's last exec action)
 *   node .cursor/hooks/tdd-guard.mjs status  → print current state
 *
 * While armed, .cursor/hooks/tdd-delegation-guard.mjs (preToolUse) blocks the
 * parent orchestrator from editing tests/source directly; subagent edits pass.
 */
import { arm, disarm, status } from './lib/tdd-guard-policy.mjs';

const cmd = (process.argv[2] || 'status').toLowerCase();

switch (cmd) {
  case 'on':
    arm();
    console.log('tdd-guard: ARMED — orchestrator direct edits to tests/source are now blocked; delegate to tdd-* subagents.');
    break;
  case 'off':
    disarm();
    console.log('tdd-guard: DISARMED — direct edits allowed again.');
    break;
  case 'status':
  default: {
    const s = status();
    console.log(`tdd-guard: ${s.armed ? 'ARMED' : 'disarmed'} (subagent depth=${s.depth})`);
    break;
  }
}
