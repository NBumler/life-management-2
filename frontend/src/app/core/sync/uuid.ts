/** Fixed, arbitrary project namespace for UUID v5 — documentation/Architektúra/Backend-offline first.md §9. Never change: it must stay identical across every install for determinism to hold. */
const PROJECT_NAMESPACE_HEX = 'b8f1d9a06c3e4b7a9e1a9d9e6f2c9d10';

export function uuidV4(): string {
  return crypto.randomUUID();
}

/** Deterministic UUID for natural-key entities (e.g. `UserProfile:<userId>`) so two devices converge on the same id. */
export async function uuidV5(name: string): Promise<string> {
  const namespaceBytes = hexToBytes(PROJECT_NAMESPACE_HEX);
  const nameBytes = new TextEncoder().encode(name);
  const data = new Uint8Array(namespaceBytes.length + nameBytes.length);
  data.set(namespaceBytes);
  data.set(nameBytes, namespaceBytes.length);
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-1', data));
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = bytesToHex(hash.slice(0, 16));
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
