import { createHash } from 'node:crypto'

const accepted = () => ({ valid: true, reason: null, stage: null })
const rejected = (reason, stage) => ({ valid: false, reason, stage })
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

// Run the version's JSON Schema before these document-wide checks.
export const checkManifestSemantics = (manifest) => {
  const keys = new Set()
  const variants = new Map()
  for (const artifact of manifest.artifacts) {
    const variant = artifact.os !== undefined
    const key =
      manifest.schema_version === 1
        ? artifact.role
        : JSON.stringify([artifact.role, artifact.os ?? null, artifact.arch ?? null])
    if (keys.has(key)) {
      return rejected(manifest.schema_version === 1 ? 'duplicate_role' : 'duplicate_artifact_key', 'semantic')
    }
    keys.add(key)
    if (manifest.schema_version === 2 && variants.has(artifact.role) && variants.get(artifact.role) !== variant) {
      return rejected('mixed_artifact_variants', 'semantic')
    }
    variants.set(artifact.role, variant)
  }

  const compatibility = manifest.minecraft_compatibility
  if (!compatibility) return accepted()
  const jars = manifest.artifacts.filter((artifact) => artifact.role === 'jar')
  if (jars.length !== 1 || jars[0].kind !== 'https-file') return rejected('jar_artifact_invalid', 'semantic')
  const verified = compatibility.verifications.map((entry) => entry.minecraft_version)
  if (new Set(verified).size !== verified.length) return rejected('duplicate_verification_version', 'semantic')
  const declared = compatibility.declaration.minecraft_versions
  if (verified.length !== declared.length || verified.some((version) => !declared.includes(version))) {
    return rejected('minecraft_version_set_mismatch', 'semantic')
  }
  if (compatibility.verifications.some((entry) => entry.jar_sha256 !== jars[0].sha256)) {
    return rejected('jar_sha256_mismatch', 'semantic')
  }
  const artifactFiles = new Set(
    manifest.artifacts.filter((entry) => entry.kind === 'https-file').map((entry) => entry.file),
  )
  if (compatibility.verifications.some((entry) => artifactFiles.has(entry.record.file))) {
    return rejected('record_listed_as_artifact', 'semantic')
  }
  return accepted()
}

// contents maps producer-relative declaration paths and Release asset basenames to raw bytes.
// Only supplied artifact bodies are checked; compatibility references must all be supplied.
export const checkManifestContents = (manifest, contents, jarDeclaration) => {
  for (const artifact of manifest.artifacts) {
    if (artifact.kind !== 'https-file' || !Object.hasOwn(contents, artifact.file)) continue
    const bytes = Buffer.from(contents[artifact.file])
    if (manifest.schema_version === 2 && bytes.length !== artifact.bytes)
      return rejected('artifact_bytes_mismatch', 'content')
    if (sha256(bytes) !== artifact.sha256) return rejected('artifact_sha256_mismatch', 'content')
  }

  const compatibility = manifest.minecraft_compatibility
  if (!compatibility) return accepted()
  const declaration = compatibility.declaration
  if (!Object.hasOwn(contents, declaration.path)) return rejected('reference_content_missing', 'content')
  const declarationBytes = Buffer.from(contents[declaration.path])
  if (sha256(declarationBytes) !== declaration.sha256) return rejected('declaration_sha256_mismatch', 'content')
  let targets
  try {
    targets = JSON.parse(declarationBytes.toString('utf8'))
  } catch {
    return rejected('declaration_content_invalid', 'content')
  }
  if (
    targets === null ||
    typeof targets !== 'object' ||
    Array.isArray(targets) ||
    Object.keys(targets).length !== 3 ||
    targets.schema !== 'mc-remote.minecraft-targets' ||
    targets.schema_version !== 1 ||
    !Array.isArray(targets.minecraft_versions) ||
    targets.minecraft_versions.length === 0 ||
    targets.minecraft_versions.some((version) => typeof version !== 'string' || version.length === 0) ||
    new Set(targets.minecraft_versions).size !== targets.minecraft_versions.length
  ) {
    return rejected('declaration_content_invalid', 'content')
  }
  const versions = targets.minecraft_versions
  if (
    versions.length !== declaration.minecraft_versions.length ||
    versions.some((version) => !declaration.minecraft_versions.includes(version))
  ) {
    return rejected('declaration_versions_mismatch', 'content')
  }
  if (jarDeclaration !== undefined && !declarationBytes.equals(Buffer.from(jarDeclaration))) {
    return rejected('jar_declaration_bytes_mismatch', 'content')
  }
  for (const { record } of compatibility.verifications) {
    if (!Object.hasOwn(contents, record.file)) return rejected('reference_content_missing', 'content')
    if (sha256(Buffer.from(contents[record.file])) !== record.sha256)
      return rejected('record_sha256_mismatch', 'content')
  }
  return accepted()
}
