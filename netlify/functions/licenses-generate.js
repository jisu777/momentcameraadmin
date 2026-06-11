const {
  json,
  parseBody,
  requireAdmin,
  listLicenses,
  insertLicenses,
  createLicenseCode,
  normalizeCode,
  licenseRow,
  resolvePeriod
} = require("./shared-license");

exports.handler = async (event) => {
  try {
    const denied = requireAdmin(event);
    if (denied) return denied;

    const body = parseBody(event);
    const count = Math.max(1, Math.min(Number(body.count || 100), 1000));
    const maxActivations = Math.max(1, Math.min(Number(body.maxActivations || 1), 20));
    const { durationDays, expiresAt } = resolvePeriod(String(body.period || "unlimited"), body.expiresAt);
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

    const existing = new Set((await listLicenses()).map((item) => item.normalizedCode));
    const pending = new Set();
    const rows = [];

    while (rows.length < count) {
      const code = createLicenseCode();
      const normalized = normalizeCode(code);
      if (existing.has(normalized) || pending.has(normalized)) continue;
      pending.add(normalized);
      rows.push(licenseRow({ code, maxActivations, durationDays, expiresAt, note }));
    }

    const licenses = await insertLicenses(rows);
    return json(200, { ok: true, count: licenses.length, licenses });
  } catch (error) {
    return json(500, { ok: false, error: error.message || "코드 생성에 실패했습니다." });
  }
};
