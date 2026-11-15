import { once } from 'node:events'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { defaultConfig, loadConfig } from '../src/config.ts'
import { createBridge } from '../src/server.ts'

it('loads a target file and rejects ambiguous legacy overrides', () => {
  const root = mkdtempSync(join(tmpdir(), 'bridge-targets-'))
  const file = join(root, 'connection-targets.json')
  try {
    writeFileSync(
      file,
      JSON.stringify({
        schema_version: 1,
        default_target_id: 'local',
        targets: [{ id: 'local', label: 'Minecraft', host: '127.0.0.1', port: 25575 }],
      }),
    )
    expect(loadConfig({ BRIDGE_TARGETS_FILE: file }).connectionTargets?.targets[0].port).toBe(25575)
    expect(() => loadConfig({ BRIDGE_TARGETS_FILE: file, BRIDGE_SANDBOX_PORT: '25575' })).toThrow(
      /cannot be combined/,
    )
    writeFileSync(file, '{}')
    expect(() => loadConfig({ BRIDGE_TARGETS_FILE: file })).toThrow()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

describe('TCP target routing', () => {
  it('forwards to two different ports on the same host and rejects unlisted IDs', async () => {
    const servers: net.Server[] = []
    const backendSockets: net.Socket[] = []
    const clients: WebSocket[] = []
    let connections = 0
    const targets = []
    for (const id of ['minecraft', 'unity']) {
      const server = net.createServer((socket) => {
        connections++
        backendSockets.push(socket)
        socket.on('data', (data) =>
          socket.write(JSON.stringify({ target: id, payload: data.toString().trim() }) + '\n'),
        )
      })
      servers.push(server)
      server.listen(0, '127.0.0.1')
      await once(server, 'listening')
      targets.push({ id, label: id, host: '127.0.0.1', port: (server.address() as net.AddressInfo).port })
    }
    const bridge = createBridge({
      ...defaultConfig,
      wsPort: 0,
      connectionTargets: { schema_version: 1, default_target_id: 'minecraft', targets },
    })
    await once(bridge, 'listening')
    try {
      const port = (bridge.address() as net.AddressInfo).port
      for (const id of ['minecraft', 'unity']) {
        const client = new WebSocket(`ws://127.0.0.1:${port}/?sandbox=${id}`, ['mcremote.bridge.one-shot.v1'], {
          origin: 'https://scratch.mc-remote.com',
        })
        clients.push(client)
        await once(client, 'open')
        const reply = once(client, 'message')
        client.send('{"id":1}')
        expect(JSON.parse(String((await reply)[0]))).toEqual({ target: id, payload: '{"id":1}' })
      }
      const denied = new WebSocket(`ws://127.0.0.1:${port}/?sandbox=127.0.0.1`, ['mcremote.bridge.one-shot.v1'], {
        origin: 'https://scratch.mc-remote.com',
      })
      clients.push(denied)
      expect((await once(denied, 'close'))[0]).toBe(1008)
      expect(connections).toBe(2)
    } finally {
      for (const client of clients) client.terminate()
      for (const socket of backendSockets) socket.destroy()
      await new Promise<void>((resolve) => bridge.close(() => resolve()))
      await Promise.all(servers.map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
    }
  })
})
