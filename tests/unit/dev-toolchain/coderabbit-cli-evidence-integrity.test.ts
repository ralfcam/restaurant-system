import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import {
  chooseCliEvidence,
  decidePushCliAction,
  hasCleanCliEvidence,
  renderCliEvidenceBlock,
} from "../../../.cursor/hooks/lib/coderabbit-pr-policy.mjs"
import {
  renderGateEvidence,
  replaceGateEvidence,
} from "../../../.cursor/hooks/lib/gate-evidence-policy.mjs"
import {
  canonicalFindingsDigest,
  cliEvidenceHash,
  stableFindingKey,
} from "../../../.cursor/hooks/lib/coderabbit-review-policy.mjs"

type FindingKeyEntry = {
  file: string
  startLine: number
  endLine: number
  title: string
  key: string
}

const digestFindings = JSON.parse(
  readFileSync(
    path.join(
      process.cwd(),
      ".cursor/checks/fixtures/coderabbit-evidence/digest-findings.json",
    ),
    "utf8",
  ),
) as { keys: FindingKeyEntry[] }

function evidenceMarker(head: string, status: string): RegExp {
  return new RegExp(
    `<!-- coderabbit-cli-evidence:${head}:${status}:[0-9a-fA-F]+ -->`,
  )
}

describe("G-CR2 HTML evidence marker", () => {
  it("renders an HTML evidence marker bound to the head", () => {
    const head = "a".repeat(40)

    const findings = renderCliEvidenceBlock({
      head,
      attemptStatus: "findings",
    })
    expect(findings).toMatch(evidenceMarker(head, "findings"))

    expect(
      hasCleanCliEvidence({ head, attemptStatus: "unavailable" }, head),
    ).toBe(false)

    const unavailable = renderCliEvidenceBlock({
      head,
      attemptStatus: "unavailable",
    })
    expect(unavailable).toMatch(evidenceMarker(head, "unavailable"))
    expect(unavailable).not.toMatch(evidenceMarker(head, "clean"))
  })
})

describe("G-CR2 stable finding key", () => {
  it("records a stable finding key that ignores severity", () => {
    for (const entry of digestFindings.keys) {
      const key = stableFindingKey({
        file: entry.file,
        startLine: entry.startLine,
        endLine: entry.endLine,
        title: entry.title,
      })
      expect(key).toBe(entry.key)
      expect(key).toMatch(/^[0-9a-f]{16}$/)
    }

    const sample = digestFindings.keys[0]
    const location = {
      file: sample.file,
      startLine: sample.startLine,
      endLine: sample.endLine,
      title: sample.title,
    }
    const major = stableFindingKey({ ...location, severity: "major" })
    const minor = stableFindingKey({ ...location, severity: "minor" })
    expect(major).toBe(minor)
    expect(major).toBe(sample.key)

    const withVendorId = stableFindingKey({
      ...location,
      severity: "major",
      id: "cr-other",
    })
    expect(withVendorId).toBe(sample.key)
    expect(withVendorId).not.toBe("cr-other")
  })
})

type EvidenceFinding = {
  severity: string
  file: string
  startLine: number
  endLine: number
  title: string
}

type EvidenceVector = {
  head: string
  status: string
  findings: EvidenceFinding[]
  digest: string
  hash: string
  marker?: string
}

function loadEvidenceVector(name: string): EvidenceVector {
  return JSON.parse(
    readFileSync(
      path.join(
        process.cwd(),
        ".cursor/checks/fixtures/coderabbit-evidence",
        name,
      ),
      "utf8",
    ),
  ) as EvidenceVector
}

describe("G-CR2 canonical findings digest", () => {
  it("binds a canonical findings digest into the evidence hash", () => {
    const findingsVector = loadEvidenceVector("digest-findings.json")
    const downgradeVector = loadEvidenceVector("digest-downgrade.json")

    expect(canonicalFindingsDigest(findingsVector.findings)).toBe(
      findingsVector.digest,
    )
    expect(canonicalFindingsDigest(downgradeVector.findings)).toBe(
      downgradeVector.digest,
    )

    const findingsHash = cliEvidenceHash({
      head: findingsVector.head,
      status: findingsVector.status,
      findings: findingsVector.findings,
    })
    const downgradeHash = cliEvidenceHash({
      head: downgradeVector.head,
      status: downgradeVector.status,
      findings: downgradeVector.findings,
    })
    expect(findingsHash).toBe(findingsVector.hash)
    expect(downgradeHash).toBe(downgradeVector.hash)
    expect(findingsHash).not.toBe(downgradeHash)

    for (const finding of findingsVector.findings) {
      const downgraded = downgradeVector.findings.find(
        (candidate) => candidate.title === finding.title,
      )
      expect(downgraded).toEqual(
        expect.objectContaining({ title: finding.title }),
      )
      expect(stableFindingKey(finding)).toBe(stableFindingKey(downgraded!))
    }

    const findingsMarker = findingsVector.marker ?? ""
    expect(findingsMarker).not.toBe("")
    expect(
      renderCliEvidenceBlock({
        head: findingsVector.head,
        attemptStatus: findingsVector.status,
        findings: findingsVector.findings,
      }),
    ).toContain(findingsMarker)
  })
})

describe("G-CR2 same-head anti-downgrade", () => {
  it("same-head rerun with no diff cannot downgrade the result", () => {
    const head = "c".repeat(40)
    const finding = {
      severity: "major",
      file: "lib/a.ts",
      startLine: 10,
      endLine: 12,
      title: "Logic  Bug",
    }
    const prior = {
      head,
      status: "findings",
      findings: [finding],
    }
    const nextClean = { head, status: "clean", findings: [] }
    const nextMinor = {
      head,
      status: "findings",
      findings: [{ ...finding, severity: "minor" }],
    }

    expect(
      chooseCliEvidence({
        prior,
        next: nextClean,
        sameHead: true,
        noDiff: true,
      }),
    ).toBe(prior)
    expect(
      chooseCliEvidence({
        prior,
        next: nextMinor,
        sameHead: true,
        noDiff: true,
      }),
    ).toBe(prior)
  })

  it("same-head rerun keeps prior when a blocking key disappears", () => {
    const head = "c".repeat(40)
    const kept = {
      severity: "major",
      file: "lib/a.ts",
      startLine: 10,
      endLine: 12,
      title: "Logic  Bug",
    }
    const dropped = {
      severity: "major",
      file: "lib/b.ts",
      startLine: 1,
      endLine: 1,
      title: "Missing AUTH check",
    }
    const prior = {
      head,
      status: "findings",
      findings: [kept, dropped],
    }
    const next = {
      head,
      status: "findings",
      findings: [kept],
    }

    expect(
      chooseCliEvidence({
        prior,
        next,
        sameHead: true,
        noDiff: true,
      }),
    ).toBe(prior)
  })
})

describe("G-CR2 replace preserves CLI evidence", () => {
  it("replaceGateEvidence preserves the HTML evidence marker", () => {
    const head = "b".repeat(40)
    const cli = renderCliEvidenceBlock({
      head,
      attemptStatus: "findings",
    })
    const marker = cli.match(
      /<!-- coderabbit-cli-evidence:[0-9a-f]{40}:findings:[0-9a-f]+ -->/,
    )?.[0]
    expect(marker).toMatch(
      new RegExp(
        `^<!-- coderabbit-cli-evidence:${head}:findings:[0-9a-f]+ -->$`,
      ),
    )

    const body = [
      "Summary",
      "",
      renderGateEvidence({ head, result: "pass" }),
      marker,
      "## CodeRabbit CLI evidence",
      `Head: ${head}`,
      "attemptStatus: findings",
      "",
    ].join("\n")

    const updated = replaceGateEvidence(
      body,
      renderGateEvidence({ head, result: "pass" }),
    )

    expect(updated).toContain(marker)
    expect(updated).toContain("## CodeRabbit CLI evidence")
  })
})

type BatchMember = {
  number: number
  head: string
  evidenceHash: string
}

type BatchCoveredVector = {
  head: string
  status: "batch_covered"
  members: BatchMember[]
  marker: string
}

function loadBatchCovered(): BatchCoveredVector {
  return JSON.parse(
    readFileSync(
      path.join(
        process.cwd(),
        ".cursor/checks/fixtures/coderabbit-evidence/batch-covered.json",
      ),
      "utf8",
    ),
  ) as BatchCoveredVector
}

function batchEvidenceMarker(block: string): string | undefined {
  return block.match(
    /<!-- coderabbit-cli-evidence:[0-9a-f]{40}:batch_covered:[0-9a-f]+ -->/,
  )?.[0]
}

function batchEvidenceHash(block: string): string | undefined {
  return block.match(
    /<!-- coderabbit-cli-evidence:[0-9a-f]{40}:batch_covered:([0-9a-f]+) -->/,
  )?.[1]
}

describe("G-CR2 batch covered member heads", () => {
  it("batch PRs record batch_covered member heads", () => {
    const vector = loadBatchCovered()
    const rendered = renderCliEvidenceBlock({
      head: vector.head,
      attemptStatus: "batch_covered",
      members: vector.members,
    })

    expect(batchEvidenceMarker(rendered)).toBe(vector.marker)

    const human = rendered.split("<!--")[0]
    for (const member of vector.members) {
      expect(human).toContain(String(member.number))
      expect(human).toContain(member.head)
    }

    const changedHead = "e".repeat(40)
    const changed = renderCliEvidenceBlock({
      head: vector.head,
      attemptStatus: "batch_covered",
      members: vector.members.map((member, index) =>
        index === 0 ? { ...member, head: changedHead } : member,
      ),
    })
    expect(batchEvidenceHash(changed)).not.toBe(batchEvidenceHash(rendered))
  })

  it("does not record batch_covered without member heads", () => {
    const head = "d".repeat(40)
    const empty = renderCliEvidenceBlock({
      head,
      attemptStatus: "batch_covered",
      members: [],
    })
    const missingHead = renderCliEvidenceBlock({
      head,
      attemptStatus: "batch_covered",
      members: [{ number: 12, head: "", evidenceHash: "aa" }],
    })

    expect(empty).not.toMatch(/attemptStatus: batch_covered/)
    expect(missingHead).not.toMatch(/attemptStatus: batch_covered/)
    expect(batchEvidenceMarker(empty)).toBeUndefined()
    expect(batchEvidenceMarker(missingHead)).toBeUndefined()
    expect(empty).toMatch(evidenceMarker(head, "unavailable"))
    expect(missingHead).toMatch(evidenceMarker(head, "unavailable"))
  })
})

type CliDisposition = {
  status: string
  reason?: string
}

type DispositionCase = {
  name: string
  findings?: EvidenceFinding[]
  dispositions: Record<string, CliDisposition>
  expect: { action: string; record: string }
}

type DispositionVector = {
  findings: EvidenceFinding[]
  cases: DispositionCase[]
}

function loadDispositions(): DispositionVector {
  const text = readFileSync(
    path.join(
      process.cwd(),
      ".cursor/checks/fixtures/coderabbit-evidence/dispositions.json",
    ),
    "utf8",
  )
  // Fixture keys such as action/status are unquoted; quote identifier keys only.
  const json = text.replace(
    /([\{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g,
    '$1"$2"$3',
  )
  return JSON.parse(json) as DispositionVector
}

describe("G-CR2 critical and major dispositions", () => {
  it("Critical and Major require a disposition before push", () => {
    const vector = loadDispositions()
    expect(vector.cases.map((testCase) => testCase.name)).toEqual([
      "missing-disposition-blocks",
      "waived-without-reason-blocks",
      "captured-and-waived-may-push",
      "fixed-only-when-absent",
    ])

    for (const testCase of vector.cases) {
      const findings = testCase.findings ?? vector.findings
      const decision = decidePushCliAction({
        attemptStatus: "findings",
        findings,
        dispositions: testCase.dispositions,
      })
      expect({
        name: testCase.name,
        action: decision.action,
        record: decision.record,
      }).toEqual({
        name: testCase.name,
        action: testCase.expect.action,
        record: testCase.expect.record,
      })
    }

    const accounted = decidePushCliAction({
      attemptStatus: "findings",
      findings: vector.findings,
      dispositions: {
        "850fd55afd7c9b1e": { status: "waived", reason: "accepted risk" },
        ac1c3c33960fd4fa: { status: "captured" },
      },
    })
    expect(accounted.leftover).toEqual([])
    expect(accounted.capture).toEqual([])
  })
})

describe("G-CR2 digest total order", () => {
  it("sorts same-file findings without startLine in a total order", () => {
    const alpha = { severity: "minor", file: "lib/a.ts", title: "alpha" }
    const beta = { severity: "major", file: "lib/a.ts", title: "beta" }

    expect(canonicalFindingsDigest([alpha, beta])).toBe(
      canonicalFindingsDigest([beta, alpha]),
    )
    expect(canonicalFindingsDigest([alpha, beta])).not.toMatch(/NaN/)
  })
})
