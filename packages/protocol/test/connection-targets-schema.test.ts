import { readFileSync } from 'node:fs'
import Ajv from 'ajv'
import { expect, it } from 'vitest'

const schema = JSON.parse(
  readFileSync(new URL('../../../schemas/connection-targets-v1.schema.json', import.meta.url), 'utf8'),
)
const fixture = JSON.parse(
  readFileSync(new URL('../../../schemas/fixtures/connection-targets-v1.json', import.meta.url), 'utf8'),
)

it('validates the proposed deployment file and refuses malformed endpoints and extra fields', () => {
  const validate = new Ajv({ strict: true }).compile(schema)
  expect(validate(fixture)).toBe(true)
  for (const patch of [{ port: 0 }, { port: 65536 }, { host: 'http://localhost' }, { token: 'no' }]) {
    expect(validate({ ...fixture, targets: [{ ...fixture.targets[0], ...patch }] })).toBe(false)
  }
})
