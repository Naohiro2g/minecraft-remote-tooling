import { describe, expect, it } from 'vitest'
import { resolveSandbox } from '../src/allowlist.ts'
import { defaultConfig } from '../src/config.ts'
import { parseConnectionTargets } from '../src/connection-targets.ts'

const targets = [
  { id: 'minecraft', label: 'Minecraft', host: '127.0.0.1', port: 25575 },
  { id: 'unity', label: 'Unity箱庭', host: '127.0.0.1', port: 25585 },
  { id: 'remote', label: '別のPC', host: 'server.example', port: 25595 },
]
const value = { schema_version: 1, default_target_id: 'minecraft', targets }

describe('ID-based connection targets', () => {
  it('routes same-host different-port and remote targets through one map', () => {
    const map = parseConnectionTargets(value)
    const config = { ...defaultConfig, connectionTargets: map }
    for (const target of targets) {
      expect(resolveSandbox(target.id, config)).toEqual({ host: target.host, port: target.port })
    }
    expect(resolveSandbox(undefined, config)).toEqual({ host: '127.0.0.1', port: 25575 })
    expect(resolveSandbox('127.0.0.1', config)).toBeNull()
    expect(resolveSandbox('127.0.0.1:25585', config)).toBeNull()
    expect(resolveSandbox('unknown', config)).toBeNull()
  })

  it('keeps routing by ID when host, port or label changes', () => {
    const changed = {
      ...value,
      targets: targets.map((t) => ({ ...t, label: '変更', host: 'new.example', port: 12345 })),
    }
    expect(resolveSandbox('unity', { ...defaultConfig, connectionTargets: parseConnectionTargets(changed) })).toEqual(
      { host: 'new.example', port: 12345 },
    )
  })

  it.each([
    { ...value, targets: [] },
    { ...value, default_target_id: 'missing' },
    { ...value, targets: [targets[0], targets[0]] },
    { ...value, targets: [{ ...targets[0], port: 0 }] },
    { ...value, targets: [{ ...targets[0], port: 65536 }] },
    { ...value, targets: [{ ...targets[0], host: 'http://server.example' }] },
    { ...value, targets: [{ ...targets[0], id: 'bad/id' }] },
    { ...value, targets: [{ ...targets[0], token: 'not-allowed' }] },
  ])('refuses invalid deployment input %#', (input) => {
    expect(() => parseConnectionTargets(input)).toThrow()
  })
})
