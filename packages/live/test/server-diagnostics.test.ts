import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { parseObserverSnapshot } from '../src/observer'

describe('server identity and learner diagnostics', () => {
  test('keeps server identity and structured range/count errors', () => {
    const snapshots = JSON.parse(
      readFileSync(new URL('./fixtures/scratch-main-lifecycle.json', import.meta.url), 'utf8'),
    ) as unknown[]
    const snapshot = structuredClone(parseObserverSnapshot(snapshots[0]))
    const stream = snapshot.streams[0]
    stream.hello.server = { name: 'mc-remote-unity-sandbox', version: '2321.3.0' }
    stream.frames = [
      {
        sequence: 1,
        observed_at: 1,
        direction: 'receive',
        request_id: 1,
        method: 'world.setBlocks',
        payload: {
          error: {
            code: -32000,
            message: 'outside',
            data: {
              reason: 'build_range_exceeded',
              bounds: { center: { x: 200, z: 200 }, build_range: 50 },
              violating: { x: 251.5, y: 64, z: 200 },
              limit: 32768,
              requested: 40000,
            },
          },
        },
      },
    ]
    expect(parseObserverSnapshot(snapshot)).toEqual(snapshot)
  })
})
