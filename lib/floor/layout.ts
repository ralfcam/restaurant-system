/**
 * Dining-room grid for /admin/floor. x/y on `tables` are cell coordinates
 * so staff can match the real room without accidental drags (move-lock).
 */

export const FLOOR_CELL_PX = 120
export const FLOOR_MIN_COLS = 4
export const FLOOR_MIN_ROWS = 3
export const FLOOR_MAX_COLS = 12
export const FLOOR_MAX_ROWS = 8
export const FLOOR_DRAG_THRESHOLD_PX = 8

export type FloorCell = { x: number; y: number }

export function clampFloorCoord(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(max, Math.round(value)))
}

export function clampFloorCell(cell: FloorCell): FloorCell {
  return {
    x: clampFloorCoord(cell.x, FLOOR_MAX_COLS - 1),
    y: clampFloorCoord(cell.y, FLOOR_MAX_ROWS - 1),
  }
}

/** Seed / mock dining-room cells (`supabase/seed.sql`, `lib/data.ts`). */
export const SEED_FLOOR_LAYOUT: Record<string, FloorCell> = {
  "1": { x: 0, y: 0 },
  "2": { x: 1, y: 0 },
  "3": { x: 2, y: 0 },
  "4": { x: 3, y: 0 },
  "5": { x: 0, y: 1 },
  "6": { x: 2, y: 1 },
  "7": { x: 3, y: 1 },
  "8": { x: 0, y: 2 },
  "9": { x: 2, y: 2 },
  "10": { x: 3, y: 2 },
}

function cellKey(cell: FloorCell): string {
  return `${cell.x},${cell.y}`
}

function isCellTaken(cell: FloorCell, occupied: FloorCell[]): boolean {
  const key = cellKey(cell)
  return occupied.some((row) => cellKey(row) === key)
}

/**
 * Give each table its own cell. Stage/default rows often share 0,0 because
 * `tables.x/y` default to 0 and older creates always wrote the origin.
 * Unique cells are kept; collisions prefer the seed cell for that label.
 */
export function spreadOverlappingTables<
  T extends FloorCell & { id: string; label: string },
>(tables: T[]): T[] {
  if (tables.length <= 1) return tables

  const groups = new Map<string, T[]>()
  for (const table of tables) {
    const key = cellKey(clampFloorCell(table))
    const group = groups.get(key)
    if (group) group.push(table)
    else groups.set(key, [table])
  }
  if ([...groups.values()].every((group) => group.length === 1)) return tables

  const nextById = new Map<string, FloorCell>()
  const occupied: FloorCell[] = []

  for (const group of groups.values()) {
    if (group.length !== 1) continue
    const cell = clampFloorCell(group[0])
    nextById.set(group[0].id, cell)
    occupied.push(cell)
  }

  const colliding = [...groups.values()]
    .filter((group) => group.length > 1)
    .flat()
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { numeric: true }),
    )

  for (const table of colliding) {
    const seed = SEED_FLOOR_LAYOUT[table.label]
    const cell =
      seed && !isCellTaken(seed, occupied) ? seed : nextFreeCell(occupied)
    nextById.set(table.id, cell)
    occupied.push(cell)
  }

  return tables.map((table) => {
    const cell = nextById.get(table.id)
    return cell ? { ...table, x: cell.x, y: cell.y } : table
  })
}

export function nextFreeCell(occupied: FloorCell[]): FloorCell {
  const taken = new Set(occupied.map((cell) => `${cell.x},${cell.y}`))
  for (let y = 0; y < FLOOR_MAX_ROWS; y += 1) {
    for (let x = 0; x < FLOOR_MAX_COLS; x += 1) {
      if (!taken.has(`${x},${y}`)) return { x, y }
    }
  }
  return { x: 0, y: FLOOR_MAX_ROWS - 1 }
}

export function floorCanvasCells(tables: FloorCell[]): {
  cols: number
  rows: number
} {
  const maxX = tables.reduce(
    (max, table) => Math.max(max, table.x),
    FLOOR_MIN_COLS - 1,
  )
  const maxY = tables.reduce(
    (max, table) => Math.max(max, table.y),
    FLOOR_MIN_ROWS - 1,
  )
  return {
    cols: Math.min(FLOOR_MAX_COLS, Math.max(FLOOR_MIN_COLS, maxX + 2)),
    rows: Math.min(FLOOR_MAX_ROWS, Math.max(FLOOR_MIN_ROWS, maxY + 2)),
  }
}

export function clientToFloorCell(
  clientX: number,
  clientY: number,
  canvas: { left: number; top: number },
): FloorCell {
  return clampFloorCell({
    x: (clientX - canvas.left) / FLOOR_CELL_PX,
    y: (clientY - canvas.top) / FLOOR_CELL_PX,
  })
}

export function tableAtCell<T extends FloorCell & { id: string }>(
  cell: FloorCell,
  tables: T[],
  ignoreId?: string,
): T | null {
  return (
    tables.find(
      (table) =>
        table.id !== ignoreId && table.x === cell.x && table.y === cell.y,
    ) ?? null
  )
}

export function floorCellStyle(cell: FloorCell): { left: number; top: number } {
  return { left: cell.x * FLOOR_CELL_PX, top: cell.y * FLOOR_CELL_PX }
}

export function mergeCellBounds(cells: FloorCell[]): {
  left: number
  top: number
  width: number
  height: number
} | null {
  if (cells.length === 0) return null
  const xs = cells.map((cell) => cell.x)
  const ys = cells.map((cell) => cell.y)
  const minX = Math.min(...xs)
  const minY = Math.min(...ys)
  const maxX = Math.max(...xs)
  const maxY = Math.max(...ys)
  return {
    left: minX * FLOOR_CELL_PX,
    top: minY * FLOOR_CELL_PX,
    width: (maxX - minX + 1) * FLOOR_CELL_PX,
    height: (maxY - minY + 1) * FLOOR_CELL_PX,
  }
}
