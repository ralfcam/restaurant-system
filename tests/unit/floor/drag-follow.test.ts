import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("floor drag drop resolution", () => {
  it("drop and merge highlight resolve from floorDropCell, not the absolute pointer cell", () => {
    const floor = read("components/staff/floor-plan.tsx")

    // finishPointerDrag body only — same slice shape as the dining-room chip.
    const finishMark = floor.indexOf("await persistPosition(drag.id, cell)")
    expect(finishMark).toBeGreaterThan(-1)
    const finishOpen = floor.lastIndexOf(
      "function finishPointerDrag",
      finishMark,
    )
    expect(finishOpen).toBeGreaterThan(-1)
    const finishClose = floor.indexOf("\n  async function ", finishMark)
    expect(finishClose).toBeGreaterThan(finishOpen)
    const finish = floor.slice(finishOpen, finishClose)

    expect(finish).not.toMatch(/pointerCell\(/)
    expect(finish).not.toMatch(/clientToFloorCell\(/)
    expect(finish).toMatch(/floorDropCell\(/)
    expect(finish).toMatch(/resolveMergeDrop/)
    expect(finish).toMatch(/resolveSplitDrop/)
    expect(finish).toMatch(/persistPosition/)

    // Merge-highlight path in onChipPointerMove only.
    const highlightMark = floor.indexOf("setDropTargetKey(occupant")
    expect(highlightMark).toBeGreaterThan(-1)
    const moveOpen = floor.lastIndexOf(
      "function onChipPointerMove",
      highlightMark,
    )
    expect(moveOpen).toBeGreaterThan(-1)
    const moveClose = floor.indexOf("\n  async function ", highlightMark)
    expect(moveClose).toBeGreaterThan(moveOpen)
    const move = floor.slice(moveOpen, moveClose)

    expect(move).toMatch(/floorDropCell\(/)
    expect(move).toMatch(/tableAtCell\(/)
  })

  it("dragging chip translates by the pointer delta without per-move cell writes", () => {
    const floor = read("components/staff/floor-plan.tsx")

    // onChipPointerMove body only — same slice as the drop-resolution test.
    const highlightMark = floor.indexOf("setDropTargetKey(occupant")
    expect(highlightMark).toBeGreaterThan(-1)
    const moveOpen = floor.lastIndexOf(
      "function onChipPointerMove",
      highlightMark,
    )
    expect(moveOpen).toBeGreaterThan(-1)
    const moveClose = floor.indexOf("\n  async function ", highlightMark)
    expect(moveClose).toBeGreaterThan(moveOpen)
    const move = floor.slice(moveOpen, moveClose)

    expect.soft(move).not.toMatch(/setDraftPositions/)
    expect.soft(move).not.toMatch(/pointerCell\(/)
    expect.soft(move).not.toMatch(/clientToFloorCell\(/)

    // Dragged table wrapper opening tag only — chip <button> is inside it
    // and must not satisfy the translate or transition checks.
    const styleAt = floor.indexOf("floorCellStyle(cell)")
    expect(styleAt).toBeGreaterThan(-1)
    const wrapperOpen = floor.lastIndexOf("<div", styleAt)
    expect(wrapperOpen).toBeGreaterThan(-1)
    const styleClose = floor.indexOf("}}", styleAt)
    expect(styleClose).toBeGreaterThan(styleAt)
    const wrapperTagEnd = floor.indexOf(">", styleClose)
    expect(wrapperTagEnd).toBeGreaterThan(styleClose)
    const wrapper = floor.slice(wrapperOpen, wrapperTagEnd + 1)

    const wrapperTranslate = wrapper.match(/translate3d?\([^)]*\)/)?.[0] ?? ""
    const moveTranslate = move.match(/translate3d?\([^)]*\)/)?.[0] ?? ""
    const translate = wrapperTranslate || moveTranslate
    expect.soft(translate).toMatch(/translate3d?\(/)
    expect.soft(translate).toMatch(/px/)
    expect.soft(translate).toMatch(/delta|pointerDelta|\.dx|\.dy/)

    expect.soft(wrapper).not.toMatch(/transition-all/)
    expect.soft(wrapper).not.toMatch(/transition-transform/)
    expect.soft(wrapper).not.toMatch(/transition\s*:\s*[^;]*transform/)
  })

  it("movable chips opt out of browser panning; locked chips do not", () => {
    const floor = read("components/staff/floor-plan.tsx")

    const downOpen = floor.indexOf("function onChipPointerDown")
    expect(downOpen).toBeGreaterThan(-1)
    const downClose = floor.indexOf("\n  function ", downOpen + 1)
    expect(downClose).toBeGreaterThan(downOpen)
    const down = floor.slice(downOpen, downClose)
    expect(down).toMatch(
      /if\s*\(\s*!unlockedIds\.has\(table\.id\)\s*\|\|\s*merging\s*\)\s*return/,
    )

    // Dining-room chip <button> only — same slice as schema.test.ts.
    const chipStart = floor.indexOf("onChipPointerDown(t, event)")
    expect(chipStart).toBeGreaterThan(-1)
    const buttonOpen = floor.lastIndexOf("<button", chipStart)
    expect(buttonOpen).toBeGreaterThan(-1)
    const buttonClose = floor.indexOf("</button>", chipStart)
    expect(buttonClose).toBeGreaterThan(buttonOpen)
    const chip = floor.slice(buttonOpen, buttonClose + "</button>".length)

    const classOpen = chip.indexOf("className={cn(")
    expect(classOpen).toBeGreaterThan(-1)
    const classClose = chip.indexOf(")}", classOpen)
    expect(classClose).toBeGreaterThan(classOpen)
    const className = chip.slice(classOpen, classClose + ")}".length)

    const canMoveArm = className.match(
      /canMove\s*\?\s*"([^"]*)"\s*:\s*"([^"]*)"/,
    )
    expect(canMoveArm).not.toBeNull()
    const trueBranch = canMoveArm?.[1] ?? ""
    const withoutTrueBranch = className.replace(
      /canMove\s*\?\s*"[^"]*"/,
      'canMove ? ""',
    )
    expect(withoutTrueBranch).not.toMatch(/touch-none/)
    expect(trueBranch).toMatch(/touch-none/)
  })
})
