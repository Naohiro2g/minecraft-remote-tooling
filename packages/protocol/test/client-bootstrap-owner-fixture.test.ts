import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import blockValues from './fixtures/block-value-v22.json'
import blocks from './fixtures/client-bootstrap-blocks-v23.2.1.json'
import close from './fixtures/client-bootstrap-close-v23.2.1.json'
import errors from './fixtures/client-bootstrap-errors-v23.2.1.json'
import framing from './fixtures/client-bootstrap-framing-v23.2.1.json'
import hello from './fixtures/client-bootstrap-hello-v23.2.1.json'
import pairing from './fixtures/client-bootstrap-pairing-v23.2.1.json'
import schema from './fixtures/client-bootstrap-v1.schema.json'

interface Step {
  op: string
  message?: Record<string, unknown>
  bytes_hex?: string
}

interface Case {
  id: string
  steps: Step[]
  expected: Record<string, unknown>
  related_cases?: string[]
  value_refs?: { file: string; pointer: string }[]
}

interface Suite {
  suite: string
  knowledge_contract: { commit: string }
  cases: Case[]
}

const suites = ['framing', 'hello', 'pairing', 'blocks', 'errors', 'close']
const fixtures = [framing, hello, pairing, blocks, errors, close] as Suite[]
const valueDocuments: Record<string, unknown> = { 'block-value-v22.json': blockValues }
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema)
const ids = fixtures.flatMap((fixture) => fixture.cases.map((entry) => entry.id))
const copyFixture = (fixture: Suite): Suite => JSON.parse(JSON.stringify(fixture)) as Suite
const messageAt = (entry: Case, index: number): Record<string, unknown> => {
  const message = entry.steps[index].message
  if (!message) throw new Error(`messageAt: missing message in ${entry.id}, step ${index}`)
  return message
}

describe('F1 client bootstrap fixture data', () => {
  it('covers all six suites with unique case identifiers', () => {
    expect(fixtures.map((fixture) => fixture.suite)).toEqual(suites)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('uses the ratified mismatch fields with both current and transitional error codes', () => {
    const current = fixtures[1].cases.find((entry) => entry.id === 'F1-HE-09')
    const transitional = fixtures[1].cases.find((entry) => entry.id === 'F1-HE-10')
    if (!current || !transitional) throw new Error('missing current or transitional protocol_mismatch case')
    const currentError = messageAt(current, 2).error as Record<string, unknown>
    const transitionalError = messageAt(transitional, 2).error as Record<string, unknown>
    expect(currentError).toMatchObject({
      code: -32000,
      data: { reason: 'protocol_mismatch', server: '23.2.1', client_requires: '24.0.0' },
    })
    expect(transitionalError).toEqual({ ...currentError, code: -32600 })
    expect(transitional.expected).toEqual(current.expected)
    expect(transitional.expected.reason).toBe('protocol_mismatch')
    expect(transitional.steps.slice(0, 2)).toEqual(current.steps.slice(0, 2))
    expect(transitional.steps.slice(3)).toEqual(current.steps.slice(3))
  })

  for (const fixture of fixtures) {
    it(`${fixture.suite}: matches the data schema and approved source`, () => {
      expect(validate(fixture), JSON.stringify(validate.errors)).toBe(true)
      expect(fixture.knowledge_contract.commit).toBe(
        fixture.suite === 'hello'
          ? '5e00768911feb7be1e54ae3b7e9c2d776b88927a'
          : '308a2a441060265e10af3d5e8e97c826c86b4ed8',
      )
    })

    for (const entry of fixture.cases) {
      it(`${entry.id}: resolves case and value references`, () => {
        const responseIds = entry.steps.filter((step) => step.op === 'peer_send').map((step) => step.message?.id)
        for (const field of ['completed_ids', 'matched_ids']) {
          const summary = entry.expected[field]
          if (Array.isArray(summary)) {
            for (const id of summary as unknown[]) expect(responseIds).toContain(id)
          }
        }
        for (const reference of entry.related_cases ?? []) {
          expect(ids, `${entry.id}: ${reference}`).toContain(reference)
        }
        for (const reference of entry.value_refs ?? []) {
          let value: unknown = valueDocuments[reference.file]
          expect(value, `${entry.id}: ${reference.file}`).not.toBeUndefined()
          for (const token of reference.pointer.slice(1).split('/')) {
            const key = token.replace(/~1/g, '/').replace(/~0/g, '~')
            expect(value, `${entry.id}: ${reference.file}${reference.pointer}`).toBeTypeOf('object')
            expect(value).not.toBeNull()
            value = (value as Record<string, unknown>)[key]
          }
          expect(value, `${entry.id}: ${reference.file}${reference.pointer}`).not.toBeUndefined()
        }
      })
    }
  }

  it('rejects malformed packet data and message envelopes', () => {
    const missingMessage = copyFixture(fixtures[1])
    delete missingMessage.cases[0].steps[1].message
    expect(validate(missingMessage)).toBe(false)

    const wrongId = copyFixture(fixtures[1])
    messageAt(wrongId.cases[0], 1).id = '1'
    expect(validate(wrongId)).toBe(false)

    const conflictingResponse = copyFixture(fixtures[1])
    messageAt(conflictingResponse.cases[0], 2).error = {
      code: -32000,
      message: 'fixture error',
      data: { reason: 'fixture_reason' },
    }
    expect(validate(conflictingResponse)).toBe(false)

    const invalidHex = copyFixture(fixtures[0])
    invalidHex.cases[0].steps[0].bytes_hex = 'xyz'
    expect(validate(invalidHex)).toBe(false)
  })
})
