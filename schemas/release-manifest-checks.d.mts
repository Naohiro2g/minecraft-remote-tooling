export interface ManifestCheckResult {
  valid: boolean
  reason: string | null
  stage: string | null
}

export function checkManifestSemantics(manifest: unknown): ManifestCheckResult
export function checkManifestContents(
  manifest: unknown,
  contents: Record<string, string | Uint8Array>,
  jarDeclaration?: string | Uint8Array,
): ManifestCheckResult
