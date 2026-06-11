import { promises as fs } from "fs";
import path from "path";
import { createId } from "./code";
import type { LicenseCode } from "./license-types";

type SupabaseLicenseRow = {
  id: string;
  code: string;
  normalized_code: string;
  status: LicenseCode["status"];
  max_activations: number;
  activation_count: number;
  bound_device_id: string | null;
  platform: string | null;
  app_version: string | null;
  note: string | null;
  purchaser_email: string | null;
  purchaser_name: string | null;
  order_id: string | null;
  source: string | null;
  duration_days: number | null;
  expires_at: string | null;
  created_at: string;
  activated_at: string | null;
  last_seen_at: string | null;
};

const localPath = path.join(process.cwd(), "data", "licenses.json");

function hasSupabase() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

function toRow(license: LicenseCode): SupabaseLicenseRow {
  return {
    id: license.id,
    code: license.code,
    normalized_code: license.normalizedCode,
    status: license.status,
    max_activations: license.maxActivations,
    activation_count: license.activationCount,
    bound_device_id: license.boundDeviceId,
    platform: license.platform,
    app_version: license.appVersion,
    note: license.note,
    purchaser_email: license.purchaserEmail,
    purchaser_name: license.purchaserName,
    order_id: license.orderId,
    source: license.source,
    duration_days: license.durationDays,
    expires_at: license.expiresAt,
    created_at: license.createdAt,
    activated_at: license.activatedAt,
    last_seen_at: license.lastSeenAt
  };
}

function fromRow(row: SupabaseLicenseRow): LicenseCode {
  return {
    id: row.id,
    code: row.code,
    normalizedCode: row.normalized_code,
    status: row.status,
    maxActivations: row.max_activations,
    activationCount: row.activation_count,
    boundDeviceId: row.bound_device_id,
    platform: row.platform,
    appVersion: row.app_version,
    note: row.note,
    purchaserEmail: row.purchaser_email,
    purchaserName: row.purchaser_name,
    orderId: row.order_id,
    source: row.source,
    durationDays: row.duration_days,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    activatedAt: row.activated_at,
    lastSeenAt: row.last_seen_at
  };
}

async function supabaseFetch(pathname: string, init: RequestInit = {}) {
  const url = `${process.env.SUPABASE_URL}/rest/v1/${pathname}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const response = await fetch(url, {
    ...init,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(init.headers ?? {})
    },
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase error ${response.status}: ${text}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function readLocal(): Promise<LicenseCode[]> {
  try {
    const text = await fs.readFile(localPath, "utf8");
    return JSON.parse(text) as LicenseCode[];
  } catch {
    return [];
  }
}

async function writeLocal(licenses: LicenseCode[]) {
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, JSON.stringify(licenses, null, 2), "utf8");
}

export async function listLicenses() {
  if (hasSupabase()) {
    const rows = (await supabaseFetch("licenses?select=*&order=created_at.desc")) as SupabaseLicenseRow[];
    return rows.map(fromRow);
  }

  return (await readLocal()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function insertLicenses(licenses: LicenseCode[]) {
  if (hasSupabase()) {
    const rows = await supabaseFetch("licenses", {
      method: "POST",
      body: JSON.stringify(licenses.map(toRow))
    }) as SupabaseLicenseRow[];
    return rows.map(fromRow);
  }

  const existing = await readLocal();
  const normalized = new Set(existing.map((item) => item.normalizedCode));
  const fresh = licenses.filter((item) => !normalized.has(item.normalizedCode));
  await writeLocal([...existing, ...fresh]);
  return fresh;
}

export async function getLicenseByCode(normalizedCode: string) {
  if (hasSupabase()) {
    const rows = (await supabaseFetch(
      `licenses?normalized_code=eq.${encodeURIComponent(normalizedCode)}&limit=1`
    )) as SupabaseLicenseRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  const licenses = await readLocal();
  return licenses.find((item) => item.normalizedCode === normalizedCode) ?? null;
}

export async function getLicenseByOrderId(orderId: string) {
  if (!orderId) return null;

  if (hasSupabase()) {
    const rows = (await supabaseFetch(
      `licenses?order_id=eq.${encodeURIComponent(orderId)}&limit=1`
    )) as SupabaseLicenseRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  const licenses = await readLocal();
  return licenses.find((item) => item.orderId === orderId) ?? null;
}

export async function updateLicense(id: string, changes: Partial<LicenseCode>) {
  if (hasSupabase()) {
    const payload: Partial<SupabaseLicenseRow> = {};
    if (changes.status !== undefined) payload.status = changes.status;
    if (changes.maxActivations !== undefined) payload.max_activations = changes.maxActivations;
    if (changes.activationCount !== undefined) payload.activation_count = changes.activationCount;
    if (changes.boundDeviceId !== undefined) payload.bound_device_id = changes.boundDeviceId;
    if (changes.platform !== undefined) payload.platform = changes.platform;
    if (changes.appVersion !== undefined) payload.app_version = changes.appVersion;
    if (changes.note !== undefined) payload.note = changes.note;
    if (changes.purchaserEmail !== undefined) payload.purchaser_email = changes.purchaserEmail;
    if (changes.purchaserName !== undefined) payload.purchaser_name = changes.purchaserName;
    if (changes.orderId !== undefined) payload.order_id = changes.orderId;
    if (changes.source !== undefined) payload.source = changes.source;
    if (changes.durationDays !== undefined) payload.duration_days = changes.durationDays;
    if (changes.expiresAt !== undefined) payload.expires_at = changes.expiresAt;
    if (changes.activatedAt !== undefined) payload.activated_at = changes.activatedAt;
    if (changes.lastSeenAt !== undefined) payload.last_seen_at = changes.lastSeenAt;

    const rows = (await supabaseFetch(`licenses?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(payload)
    })) as SupabaseLicenseRow[];
    return rows[0] ? fromRow(rows[0]) : null;
  }

  const licenses = await readLocal();
  const next = licenses.map((item) => item.id === id ? { ...item, ...changes } : item);
  await writeLocal(next);
  return next.find((item) => item.id === id) ?? null;
}

export function createLicense(input: {
  code: string;
  normalizedCode: string;
  maxActivations: number;
  durationDays: number | null;
  expiresAt: string | null;
  note: string | null;
  purchaserEmail?: string | null;
  purchaserName?: string | null;
  orderId?: string | null;
  source?: string | null;
}): LicenseCode {
  const now = new Date().toISOString();
  return {
    id: createId(),
    code: input.code,
    normalizedCode: input.normalizedCode,
    status: "active",
    maxActivations: input.maxActivations,
    activationCount: 0,
    boundDeviceId: null,
    platform: null,
    appVersion: null,
    note: input.note,
    purchaserEmail: input.purchaserEmail ?? null,
    purchaserName: input.purchaserName ?? null,
    orderId: input.orderId ?? null,
    source: input.source ?? null,
    durationDays: input.durationDays,
    expiresAt: input.expiresAt,
    createdAt: now,
    activatedAt: null,
    lastSeenAt: null
  };
}
