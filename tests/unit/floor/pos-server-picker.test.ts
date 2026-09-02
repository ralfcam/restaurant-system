import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const root = process.cwd()

function read(rel: string) {
  return readFileSync(path.join(root, rel), "utf8")
}

describe("POS server picker from live server inventory", () => {
  it("POS server picker lists live getServers() servers, not the SERVERS seed", () => {
    const page = read("app/pos/page.tsx")
    const terminal = read("components/staff/pos-terminal.tsx")

    expect(page).not.toMatch(/\bSERVERS\b/)
    expect(terminal).not.toMatch(/\bSERVERS\b/)

    expect(page).toMatch(/getServers\(/)
    expect(page).toMatch(/<PosTerminal[\s\S]*servers=/)

    const serverSelect = terminal.slice(terminal.indexOf(">Server</label>"))
    expect(serverSelect).toMatch(/servers\.map\(/)
    expect(terminal).toMatch(/useState\(\s*servers\[0\]\?\.name/)
  })

  it("server select disables with a placeholder when no servers are available", () => {
    const terminal = read("components/staff/pos-terminal.tsx")
    const serverSelect = terminal.slice(terminal.indexOf(">Server</label>"))

    expect(serverSelect).toMatch(/disabled=\{servers\.length === 0\}/)
    expect(serverSelect).toMatch(/<SelectValue[^>]*placeholder=["'][^"']+["']/)
  })
})
