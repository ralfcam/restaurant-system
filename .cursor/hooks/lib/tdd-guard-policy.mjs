/**
 * Shared state + path policy for the /sdd-to-tdd delegation guard.
 *
 * Goal: while an sdd-to-tdd execution is ARMED, the top-level orchestrator must
 * not edit implementation/test files directly — those edits must come from the
 * tdd-red / tdd-green / tdd-refactor subagents. We allow the write when a
 * subagent is currently running (depth > 0) and block it when the parent is the
 * one editing (depth === 0).
 *
 * State is a single JSON file so the CLI control (`tdd-guard.mjs on/off`), the
 * subagent depth tracker, and the preToolUse guard all share it.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const STATE_PATH = join(__dirname, '..', 'state', 'tdd-guard.json');

/** Paths the orchestrator may NOT edit directly while armed (delegate instead). */
export const PROTECTED_PREFIXES = [
  'tests/',
  'lib/',
  'app/',
  'components/',
  'hooks/',
  'src/',
  'supabase/',
];

/**
 * The one direct write the orchestrator is allowed to make while armed: the
 * approved spec edit. Everything outside PROTECTED_PREFIXES is allowed anyway;
 * this list documents the intended carve-out.
 */
export const ALLOWED_FOR_PARENT = ['docs/'];

/** Tools that write to disk (best-effort; tighten once real names are confirmed). */
const WRITE_TOOL_RE = /(write|edit|replace|patch|create|apply)/i;

export function readStdinJson() {
  try {
    const text = readFileSync(0, 'utf8');
    return text ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

export function writeStdoutJson(obj) {
  process.stdout.write(`${JSON.stringify(obj)}\n`);
}

function loadState() {
  try {
    if (!existsSync(STATE_PATH)) return { armed: false, depth: 0 };
    const s = JSON.parse(readFileSync(STATE_PATH, 'utf8'));
    return { armed: Boolean(s.armed), depth: Number(s.depth) || 0 };
  } catch {
    return { armed: false, depth: 0 };
  }
}

function saveState(state) {
  mkdirSync(dirname(STATE_PATH), { recursive: true });
  writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

export function arm() {
  saveState({ armed: true, depth: 0 });
}

export function disarm() {
  saveState({ armed: false, depth: 0 });
}

export function isArmed() {
  return loadState().armed;
}

export function getDepth() {
  return loadState().depth;
}

export function incDepth() {
  const s = loadState();
  if (!s.armed) return;
  saveState({ armed: true, depth: s.depth + 1 });
}

export function decDepth() {
  const s = loadState();
  if (!s.armed) return;
  saveState({ armed: true, depth: Math.max(0, s.depth - 1) });
}

export function status() {
  return loadState();
}

export function isWriteTool(toolName) {
  return typeof toolName === 'string' && WRITE_TOOL_RE.test(toolName);
}

/** Pull the target file path from common tool-input shapes. */
export function extractPath(toolInput) {
  if (!toolInput || typeof toolInput !== 'object') return null;
  const direct =
    toolInput.path ||
    toolInput.file_path ||
    toolInput.target_file ||
    toolInput.filePath;
  if (typeof direct === 'string') return normalize(direct);
  // MultiEdit-style: edits[].file_path
  if (Array.isArray(toolInput.edits) && toolInput.edits[0]) {
    const p = toolInput.edits[0].file_path || toolInput.edits[0].path;
    if (typeof p === 'string') return normalize(p);
  }
  return null;
}

function normalize(p) {
  // Strip a leading absolute repo path and normalize slashes to forward slashes.
  let s = String(p).replace(/\\/g, '/');
  const marker = '/restaurant-system/';
  const idx = s.indexOf(marker);
  if (idx !== -1) s = s.slice(idx + marker.length);
  return s.replace(/^\.?\//, '');
}

export function isProtected(relPath) {
  if (!relPath) return false;
  return PROTECTED_PREFIXES.some((p) => relPath.startsWith(p));
}
