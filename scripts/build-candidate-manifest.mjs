import { createHash } from "node:crypto";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const [commit, bridgeDigest] = process.argv.slice(2);
if (
  !/^[0-9a-f]{40}$/.test(commit || "") ||
  !/^sha256:[0-9a-f]{64}$/.test(bridgeDigest || "")
) {
  throw new Error("a full source commit and Bridge OCI digest are required");
}
const directory = resolve("artifacts");
mkdirSync(directory, { recursive: true });
for (const file of ["wirescope-app.zip", "wirescope-app.manifest.json"]) {
  copyFileSync(
    resolve("packages/live/dist/artifacts", file),
    resolve(directory, file),
  );
}
const wireScope = JSON.parse(
  readFileSync(resolve(directory, "wirescope-app.manifest.json"), "utf8"),
);
if (
  wireScope.source.commit !== commit ||
  wireScope.source.repository !==
    "https://github.com/Naohiro2g/minecraft-remote-tooling"
) {
  throw new Error("WireScope source does not match the candidate source");
}
const entries = [
  ["wirescope", "wirescope-app.zip"],
  ["wirescope-manifest", "wirescope-app.manifest.json"],
  ["bridge", "bridge.oci.tar"],
].map(([role, file]) => {
  const bytes = readFileSync(resolve(directory, file));
  return {
    role,
    file,
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    ...(role === "bridge"
      ? { kind: "oci-archive", digest: bridgeDigest }
      : { kind: "https-file" }),
  };
});
if (entries[0].sha256 !== wireScope.archive.sha256)
  throw new Error("WireScope ZIP digest does not match its manifest");
writeFileSync(
  resolve(directory, "candidate-manifest.json"),
  `${JSON.stringify(
    {
      schema: "mcremote.tooling-candidate",
      schema_version: 1,
      source: {
        repository: "https://github.com/Naohiro2g/minecraft-remote-tooling",
        commit,
      },
      artifacts: entries,
    },
    null,
    2,
  )}\n`,
);
