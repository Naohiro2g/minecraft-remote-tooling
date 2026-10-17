import { describe, expect, it } from 'vitest'
import { PROTOCOL_VERSION } from '../src/index.ts'
import currentChat from './fixtures/chat-event-compat-v23.2.1.json'
import previousChat from './fixtures/chat-event-compat-v23.2.json'
import currentEntity from './fixtures/entity-particle-v23.2.1.json'
import previousEntity from './fixtures/entity-particle-v23.2.json'

describe('protocol 23.2.1 shared fixtures', () => {
  it('updates only the version identity of the chat and event contract', () => {
    expect(currentChat.schema).toBe('mcremote.chat-event-compat.v23.2.1')
    expect(currentChat.protocol).toBe(PROTOCOL_VERSION)
    expect({ ...currentChat, schema: previousChat.schema, protocol: previousChat.protocol }).toEqual(previousChat)
  })

  it('updates only the version identity of the entity and particle contract', () => {
    expect(currentEntity.schema).toBe('mcremote.entity-particle.v23.2.1')
    expect(currentEntity.protocol).toBe(PROTOCOL_VERSION)
    expect({ ...currentEntity, schema: previousEntity.schema, protocol: previousEntity.protocol }).toEqual(
      previousEntity,
    )
  })
})
