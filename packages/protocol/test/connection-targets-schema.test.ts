import Ajv from 'ajv'
import { expect, it } from 'vitest'
import schema from '../../../schemas/connection-targets-v1.schema.json'
import fixture from '../../../schemas/fixtures/connection-targets-v1.json'

it('validates the proposed deployment file and refuses malformed endpoints and extra fields', () => {
  const validate = new Ajv({ strict: true }).compile(schema)
  expect(validate(fixture)).toBe(true)
  for (const patch of [{ port: 0 }, { port: 65536 }, { host: 'http://localhost' }, { token: 'no' }]) {
    expect(validate({ ...fixture, targets: [{ ...fixture.targets[0], ...patch }] })).toBe(false)
  }
})
