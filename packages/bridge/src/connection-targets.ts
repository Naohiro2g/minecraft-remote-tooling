/** A deployment-owned target; identity is independent of its endpoint and label. */
export interface ConnectionTarget {
  id: string
  label: string
  host: string
  port: number
}

export interface ConnectionTargets {
  schema_version: 1
  default_target_id: string
  targets: readonly ConnectionTarget[]
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/**
 * Validate the operator-controlled file before opening any listening socket.
 * @param value Parsed JSON deployment input.
 * @returns Validated routing table.
 */
export function parseConnectionTargets(value: unknown): ConnectionTargets {
  if (
    !isRecord(value) ||
    value.schema_version !== 1 ||
    Object.keys(value).some((key) => !['schema_version', 'default_target_id', 'targets'].includes(key)) ||
    typeof value.default_target_id !== 'string' ||
    !Array.isArray(value.targets) ||
    value.targets.length === 0
  ) {
    throw new Error('Connection targets require schema_version=1, default_target_id and a nonempty targets array')
  }
  const ids = new Set<string>()
  const targets = value.targets.map((target: unknown, index: number): ConnectionTarget => {
    if (
      !isRecord(target) ||
      Object.keys(target).some((key) => !['id', 'label', 'host', 'port'].includes(key)) ||
      typeof target.id !== 'string' ||
      !/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,63}$/.test(target.id) ||
      typeof target.label !== 'string' ||
      !target.label.trim() ||
      typeof target.host !== 'string' ||
      target.host.length > 253 ||
      !/^(?:[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?|[a-f0-9]*:[a-f0-9:]+)$/i.test(target.host) ||
      !Number.isInteger(target.port) ||
      Number(target.port) < 1 ||
      Number(target.port) > 65535
    ) {
      throw new Error(`Invalid connection target at index ${index}: expected id, label, host and port (1–65535)`)
    }
    if (ids.has(target.id)) throw new Error(`Duplicate connection target id: ${target.id}`)
    ids.add(target.id)
    return { id: target.id, label: target.label.trim(), host: target.host, port: Number(target.port) }
  })
  if (!ids.has(value.default_target_id)) throw new Error('default_target_id must identify a configured target')
  return { schema_version: 1, default_target_id: value.default_target_id, targets }
}
