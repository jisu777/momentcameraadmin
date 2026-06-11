const {
  json,
  parseBody,
  requireIssueSecret,
  getByOrderId,
  listLicenses,
  createLicenseCode,
  normalizeCode,
  licenseRow,
  insertLicenses
} = require("./shared-license");

exports.handler = async (event) => {
  try {
    const denied = requireIssueSecret(event);
    if (denied) return denied;
    const body = parseBody(event);
    const email = String(body.email || "").trim().slice(0, 160);
    const name = String(body.name || "").trim().slice(0, 80) || null;
    const orderId = String(body.orderId || "").trim().slice(0, 120);
    const source = String(body.source || "purchase").trim().slice(0, 80);
    if (!email || !email.includes("@")) return json(400, { ok: false, error: "구매자 이메일이 필요합니다." });
    if (!orderId) return json(400, { ok: false, error: "주문 ID가 필요합니다." });

    const existing = await getByOrderId(orderId);
    if (existing) return json(200, { ok: true, duplicate: true, code: existing.code, license: existing });

    const existingCodes = new Set((await listLicenses()).map((item) => item.normalizedCode));
    let code = createLicenseCode();
    while (existingCodes.has(normalizeCode(code))) code = createLicenseCode();
    const note = `자동발급 | 구매처: ${source} | 이메일: ${email}${name ? ` | 이름: ${name}` : ""} | 주문: ${orderId}`;
    const [license] = await insertLicenses([
      licenseRow({
        code,
        maxActivations: 1,
        durationDays: null,
        expiresAt: null,
        note,
        purchaserEmail: email,
        purchaserName: name,
        orderId,
        source
      })
    ]);
    return json(200, { ok: true, duplicate: false, code: license.code, license });
  } catch (error) {
    return json(500, { ok: false, error: error.message || "자동발급에 실패했습니다." });
  }
};
