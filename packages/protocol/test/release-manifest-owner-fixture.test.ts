import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import legacySchema from '../../../schemas/fixtures/release-manifest-v1.schema.json'
import rawFixture from '../../../schemas/fixtures/release-manifest-v2.json'
import { checkManifestSemantics, checkManifestContents } from '../../../schemas/release-manifest-checks.mjs'
import schema from '../../../schemas/release-manifest-v2.schema.json'

interface Fixture {
  knowledge_contract: { commit: string; decision: string }
  cases: {
    id: string
    manifest: { schema_version: number }
    expected: { valid: boolean; reason: string | null; stage: string | null }
    contents?: Record<string, string>
    jar_declaration?: string
  }[]
}
const fixture = rawFixture as Fixture
const ajv = new Ajv2020({ allErrors: true, strict: false })
const validators = new Map([
  [1, ajv.compile(legacySchema)],
  [2, ajv.compile(schema)],
])

describe('release manifest shared owner fixture', () => {
  it('pins the approved metadata contract separately from wire protocol', () => {
    expect(fixture.knowledge_contract.commit).toBe('6dbb9f1ee192c6c46d8dd58fdd91f8e6c3f46de5')
    expect(fixture.knowledge_contract.decision).toBe('2026-10-07-09')
    expect(new Set(fixture.cases.map((entry: { id: string }) => entry.id)).size).toBe(fixture.cases.length)
  })

  for (const entry of fixture.cases) {
    it(entry.id, () => {
      const validate = validators.get(entry.manifest.schema_version)
      let result
      if (!validate) result = { valid: false, reason: 'unsupported_schema_version', stage: 'version' }
      else if (!validate(entry.manifest)) result = { valid: false, reason: 'schema_invalid', stage: 'schema' }
      else {
        result = checkManifestSemantics(entry.manifest)
        if (result.valid && entry.contents) {
          result = checkManifestContents(entry.manifest, entry.contents, entry.jar_declaration)
        }
      }
      expect(result).toEqual(entry.expected)
    })
  }
})
