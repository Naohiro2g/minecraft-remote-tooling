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

  it('settles pending close requests as local completion-unknown failures', () => {
    for (const id of ['F1-CL-03', 'F1-CL-05']) {
      const entry = fixtures[5].cases.find((candidate) => candidate.id === id)
      if (!entry) throw new Error(`missing close case ${id}`)
      expect(entry.expected).toMatchObject({
        connection: 'closed',
        unanswered_ids: [2],
        pending_ids: [],
        local_failures: [{ id: 2, outcome: 'completion_unknown' }],
      })
      expect(entry.expected).not.toHaveProperty('error')
      expect(entry.expected).not.toHaveProperty('reason')
    }
  })

  it('returns to tokenless hello before pairing and stops after one pairing attempt', () => {
    for (const id of ['F1-AU-08', 'F1-AU-09', 'F1-AU-10']) {
      const entry = fixtures[2].cases.find((candidate) => candidate.id === id)
      if (!entry) throw new Error(`missing credential recovery case ${id}`)
      const sends = entry.steps.filter((step) => step.op === 'client_send').map((step) => step.message)
      expect(sends[0]).toMatchObject({ method: 'hello', params: { auth: { token: 'mcrs_fixture_expired' } } })
      expect(sends[1]).toMatchObject({ method: 'hello' })
      expect(sends[1]?.params).not.toHaveProperty('auth')
      const begins = sends.filter((message) => message?.method === 'auth.pairBegin')
      expect(begins).toHaveLength(id === 'F1-AU-09' ? 0 : 1)
      expect(entry.expected.pairing_attempts).toBe(begins.length)
      if (id === 'F1-AU-10') {
        expect(sends.at(-1)).toMatchObject({ method: 'hello' })
        expect(entry.expected).toMatchObject({ reason: 'token_revoked', discard_token: true })
      } else {
        expect(entry.expected).toHaveProperty('result')
      }
    }
  })

  it('keeps local failure outcomes separate from server errors and reasons', () => {
    const valid = copyFixture(fixtures[5])
    valid.cases[0].expected = { local_failures: [{ id: 2, outcome: 'completion_unknown' }] }
    expect(validate(valid), JSON.stringify(validate.errors)).toBe(true)
    for (const extra of [{ reason: 'connection_closed' }, { code: -32000 }, { outcome: 'success' }]) {
      const invalid = copyFixture(valid)
      invalid.cases[0].expected.local_failures = [{ id: 2, outcome: 'completion_unknown', ...extra }]
      expect(validate(invalid)).toBe(false)
    }
  })

  it('observes client rejection and close before any post-hello request', () => {
    for (const id of ['F1-HE-11', 'F1-HE-12']) {
      const entry = fixtures[1].cases.find((candidate) => candidate.id === id)
      if (!entry) throw new Error(`missing incompatible close case ${id}`)
      expect(entry.steps.filter((step) => step.op === 'client_send')).toHaveLength(1)
      expect(entry.steps.at(-1)?.op).toBe('client_close')
      expect(entry.expected).toMatchObject({
        compatible: false,
        connection: 'closed',
        application_failure: { kind: 'incompatible_protocol', source: 'client' },
      })
      expect(entry.expected).not.toHaveProperty('error')
    }
  })

  it('discards a complete JSON tail without LF and settles every pending request on local close', () => {
    const eof = fixtures[5].cases.find((entry) => entry.id === 'F1-CL-07')
    const local = fixtures[5].cases.find((entry) => entry.id === 'F1-CL-08')
    if (!eof || !local) throw new Error('missing EOF or local close case')
    const hex = eof.steps.find((step) => step.op === 'peer_bytes')?.bytes_hex
    if (!hex) throw new Error('missing complete JSON tail')
    const bytes = hex.match(/../g)
    if (!bytes) throw new Error('missing JSON tail bytes')
    const text = String.fromCharCode(...bytes.map((byte) => Number.parseInt(byte, 16)))
    expect(() => JSON.parse(text) as unknown).not.toThrow()
    expect(text.endsWith('\n')).toBe(false)
    expect(eof.expected).toMatchObject({
      completed_ids: [1],
      pending_ids: [],
      local_failures: [{ id: 2, outcome: 'completion_unknown' }],
    })
    expect(local.steps.at(-1)?.op).toBe('client_close')
    expect(local.expected).toMatchObject({
      pending_ids: [],
      local_failures: [
        { id: 2, outcome: 'completion_unknown' },
        { id: 3, outcome: 'completion_unknown' },
      ],
    })
  })

  for (const fixture of fixtures) {
    it(`${fixture.suite}: matches the data schema and approved source`, () => {
      expect(validate(fixture), JSON.stringify(validate.errors)).toBe(true)
      expect(fixture.knowledge_contract.commit).toBe(
        fixture.suite === 'hello' || fixture.suite === 'close'
          ? '076a127a22eaf0188c1d13822bfd55bfeee9ec38'
          : fixture.suite === 'pairing'
            ? '562b5c008c7a4e391f04a79ed4496bbd44670896'
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
