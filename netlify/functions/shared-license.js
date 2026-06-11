const crypto = require("crypto");

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function json(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(data)
  };
}

function parseBody(event) {
  if (!event.body) return {};
  try {
    return JSON.parse(event.body);
  } catch {
    return {};
  }
}

function normalizeCode(input) {
  return String(input || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function formatCode(input) {
  const normalized = normalizeCode(input);
  return normalized.match(/.{1,4}/g)?.join("-") || normalized;
}

function createLicenseCode() {
  const bytes = crypto.randomBytes(16);
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte % ALPHABET.length];
  return formatCode(code);
}

function requireAdmin(event) {
  const expected = process.env.ADMIN_PASSWORD || "M0M3NTCAM3RA";
  const provided = event.headers["x-admin-password"] || event.headers["X-Admin-Password"];
  if (!provided || provided !== expected) {
    return json(401, { ok: false, error: "관리자 비밀번호가 올바르지 않습니다." });
  }
  return null;
}

function requireIssueSecret(event) {
  const expected = process.env.ISSUE_SECRET;
  const provided = event.headers["x-issue-secret"] || event.headers["X-Issue-Secret"];
  if (!expected || provided !== expected) {
    return json(401, { ok: false, error: "자동발급 비밀키가 올바르지 않습니다." });
  }
  return null;
}

function supabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 환경변수가 필요합니다.");
  }
  return { url: url.replace(/\/+$/, ""), key };
}

async function supabaseFetch(pathname, options = {}) {
  const { url, key } = supabaseConfig();
  const response = await fetch(`${url}/rest/v1/${pathname}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase ${response.status}: ${text || response.statusText}`);
  }
  return text ? JSON.parse(text) : null;
}

function toLicense(row) {
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

function licenseRow(input) {
  const row = {
    id: crypto.randomUUID(),
    code: input.code,
    normalized_code: normalizeCode(input.code),
    status: "active",
    max_activations: input.maxActivations || 1,
    activation_count: 0,
    note: input.note || null,
    duration_days: input.durationDays || null,
    expires_at: input.expiresAt || null,
    purchaser_email: input.purchaserEmail || null,
    purchaser_name: input.purchaserName || null,
    order_id: input.orderId || null,
    source: input.source || null,
    created_at: new Date().toISOString()
  };
  return Object.fromEntries(Object.entries(row).filter(([, value]) => value !== null && value !== undefined));
}

async function listLicenses() {
  const rows = await supabaseFetch("licenses?select=*&order=created_at.desc");
  return (rows || []).map(toLicense);
}

async function getByCode(normalizedCode) {
  const rows = await supabaseFetch(`licenses?normalized_code=eq.${encodeURIComponent(normalizedCode)}&limit=1`);
  return rows && rows[0] ? toLicense(rows[0]) : null;
}

async function getByOrderId(orderId) {
  const rows = await supabaseFetch(`licenses?order_id=eq.${encodeURIComponent(orderId)}&limit=1`);
  return rows && rows[0] ? toLicense(rows[0]) : null;
}

async function insertLicenses(rows) {
  const inserted = await supabaseFetch("licenses", {
    method: "POST",
    body: JSON.stringify(rows)
  });
  return (inserted || []).map(toLicense);
}

async function updateLicense(id, changes) {
  const payload = Object.fromEntries(Object.entries(changes).filter(([, value]) => value !== undefined));
  const rows = await supabaseFetch(`licenses?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
  return rows && rows[0] ? toLicense(rows[0]) : null;
}

function resolvePeriod(period, customExpiresAt) {
  if (!period || period === "unlimited") return { durationDays: null, expiresAt: null };
  if (period === "custom") {
    if (!customExpiresAt) throw new Error("직접 만료일을 선택해야 합니다.");
    return { durationDays: null, expiresAt: new Date(String(customExpiresAt)).toISOString() };
  }
  const days = Number(period);
  if (![7, 30, 365].includes(days)) throw new Error("라이선스 기간이 올바르지 않습니다.");
  return { durationDays: days, expiresAt: null };
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

module.exports = {
  json,
  parseBody,
  normalizeCode,
  createLicenseCode,
  requireAdmin,
  requireIssueSecret,
  listLicenses,
  getByCode,
  getByOrderId,
  insertLicenses,
  updateLicense,
  licenseRow,
  resolvePeriod,
  addDays
};
