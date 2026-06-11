import { randomBytes, randomUUID } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeCode(input: string) {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function formatCode(input: string) {
  const normalized = normalizeCode(input);
  return normalized.match(/.{1,4}/g)?.join("-") ?? normalized;
}

export function createLicenseCode() {
  let code = "";
  const bytes = randomBytes(16);

  for (const byte of bytes) {
    code += ALPHABET[byte % ALPHABET.length];
  }

  return formatCode(code);
}

export function createId() {
  return randomUUID();
}
