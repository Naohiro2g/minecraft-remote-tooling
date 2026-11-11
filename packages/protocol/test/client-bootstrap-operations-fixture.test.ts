import Ajv from 'ajv'
import { describe, expect, it } from 'vitest'
import operations from './fixtures/client-bootstrap-operations-v23.2.1.json'
import schema from './fixtures/client-bootstrap-v2.schema.json'

interface Step {
  op: string
  call?: string
  connection?: string
  message?: { id?: number; method?: string; params?: unknown; result?: unknown }
  expected?: Expectations
}
interface Expectations {
  calls?: { call: string; outcome: string; source: string; connection?: string; error?: unknown }[]
  connections?: { connection: string; state?: string; sent_count: number; pending_ids: number[] }[]
  flushes?: { call: string; connection: string; excluded_connections: string[] }[]
  events?: { connection: string; previous_connection: string }[]
  negotiations?: { connection: string }[]
  epoch_states?: { connection: string }[]
  catalogs?: { connection: string }[]
}
interface Case {
  id: string
  steps: Step[]
  expected: Expectations
}
const fixture = operations as { cases: Case[] }
const validate = new Ajv({ allErrors: true, strict: false }).compile(schema)
const clone = (): typeof fixture => JSON.parse(JSON.stringify(fixture)) as typeof fixture

describe('F1 operation fixture data', () => {
  it('validates a distinct v2 format with twelve unique cases', () => {
    expect(validate(operations), JSON.stringify(validate.errors)).toBe(true)
    const ids = fixture.cases.map((entry) => entry.id)
    expect(new Set(ids).size).toBe(12)
    expect(ids).toEqual(Array.from({ length: 12 }, (_, index) => `F1-OP-${String(index + 1).padStart(2, '0')}`))
  })

  for (const entry of fixture.cases) {
    it(`${entry.id}: correlates application calls and observes each declared connection`, () => {
      const calls = new Set<string>()
      const connections = new Set<string>()
      const messages = new Map<string, number>()
      const check = (expected: Expectations): void => {
        for (const result of expected.calls ?? []) {
          expect(calls.has(result.call), result.call).toBe(true)
          if (result.connection) expect(connections.has(result.connection)).toBe(true)
        }
        for (const state of [
          ...(expected.events ?? []),
          ...(expected.negotiations ?? []),
          ...(expected.epoch_states ?? []),
          ...(expected.catalogs ?? []),
        ]) {
          expect(connections.has(state.connection)).toBe(true)
        }
        for (const event of expected.events ?? []) expect(connections.has(event.previous_connection)).toBe(true)
        for (const state of expected.connections ?? []) {
          expect(connections.has(state.connection), state.connection).toBe(true)
          expect(messages.get(state.connection)).toBe(state.sent_count)
        }
        for (const flush of expected.flushes ?? []) {
          expect(calls.has(flush.call)).toBe(true)
          expect(connections.has(flush.connection)).toBe(true)
          expect(flush.excluded_connections).not.toContain(flush.connection)
          for (const connection of flush.excluded_connections) expect(connections.has(connection)).toBe(true)
        }
      }
      for (const step of entry.steps) {
        if (step.op === 'app_call' || step.op === 'app_connect') {
          if (!step.call) throw new Error(`${entry.id}: application call is missing its identity`)
          expect(calls.has(step.call)).toBe(false)
          calls.add(step.call)
        }
        if (step.op === 'expect_connect') {
          if (!step.connection) throw new Error(`${entry.id}: missing connection identity`)
          expect(connections.has(step.connection)).toBe(false)
          connections.add(step.connection)
          messages.set(step.connection, 0)
        } else if (step.connection) {
          expect(connections.has(step.connection), `${entry.id}: ${step.connection}`).toBe(true)
        }
        if (step.op === 'expect_send' && step.connection) {
          messages.set(step.connection, (messages.get(step.connection) ?? 0) + 1)
        }
        if (step.expected) check(step.expected)
      }
      check(entry.expected)
    })
  }

  it('allows FAST notifications but rejects responses disguised as notifications', () => {
    const data = clone()
    const fast = data.cases[5].steps.find((step) => step.message?.method === 'world.setBlock')
    if (!fast?.message) throw new Error('missing FAST message')
    expect(fast.message).not.toHaveProperty('id')
    fast.message.result = null
    expect(validate(data)).toBe(false)
  })

  it('rejects fabricated server errors and reasons on local outcomes', () => {
    for (const index of [0, 4, 7]) {
      for (const extra of [{ error: { code: -32000 } }, { reason: 'fixture_reason' }]) {
        const data = clone()
        expect(validate(data), JSON.stringify(validate.errors)).toBe(true)
        const result = data.cases[index].expected.calls?.[0]
        if (!result) throw new Error('missing local call outcome')
        Object.assign(result, extra)
        expect(validate(data)).toBe(false)
      }
    }
  })

  it('rejects absolute timeout durations, missing clock bindings and unknown operations', () => {
    const invalid: Record<string, unknown>[] = [
      { op: 'advance_clock', timer: 'receive_idle', connection: 'c1', milliseconds: 1000 },
      { op: 'advance_clock', timer: 'receive_idle', fraction: { numerator: 1, denominator: 2 } },
      { op: 'advance_clock', timer: 'receive_idle', connection: 'c1', fraction: { numerator: 1, denominator: 0 } },
      { op: 'retry_every_request' },
    ]
    for (const step of invalid) {
      const data = clone()
      data.cases[0].steps[0] = step as unknown as Step
      expect(validate(data)).toBe(false)
    }
  })
})
