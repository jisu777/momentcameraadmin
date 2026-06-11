import { NextRequest, NextResponse } from "next/server";
import { createLicenseCode, normalizeCode } from "@/lib/code";
import { createLicense, getLicenseByOrderId, insertLicenses, listLicenses } from "@/lib/license-store";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.ISSUE_SECRET;
  const providedSecret = request.headers.get("x-issue-secret");

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ ok: false, error: "자동발급 비밀키가 올바르지 않습니다." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const purchaserEmail = clean(body.email, 160);
  const purchaserName = clean(body.name, 80);
  const orderId = clean(body.orderId, 120);
  const source = clean(body.source, 80) ?? "purchase";

  if (!purchaserEmail || !purchaserEmail.includes("@")) {
    return NextResponse.json({ ok: false, error: "구매자 이메일이 필요합니다." }, { status: 400 });
  }

  if (!orderId) {
    return NextResponse.json({ ok: false, error: "주문 ID가 필요합니다." }, { status: 400 });
  }

  const existingForOrder = await getLicenseByOrderId(orderId);
  if (existingForOrder) {
    return NextResponse.json({
      ok: true,
      duplicate: true,
      code: existingForOrder.code,
      license: existingForOrder
    });
  }

  const existingCodes = new Set((await listLicenses()).map((item) => item.normalizedCode));
  let code = createLicenseCode();
  let normalizedCode = normalizeCode(code);

  while (existingCodes.has(normalizedCode)) {
    code = createLicenseCode();
    normalizedCode = normalizeCode(code);
  }

  const note = [
    "자동발급",
    source ? `구매처: ${source}` : null,
    purchaserEmail ? `이메일: ${purchaserEmail}` : null,
    purchaserName ? `이름: ${purchaserName}` : null,
    orderId ? `주문: ${orderId}` : null
  ].filter(Boolean).join(" | ");

  const [license] = await insertLicenses([
    createLicense({
      code,
      normalizedCode,
      maxActivations: 1,
      durationDays: null,
      expiresAt: null,
      note,
      purchaserEmail,
      purchaserName,
      orderId,
      source
    })
  ]);

  return NextResponse.json({
    ok: true,
    duplicate: false,
    code: license.code,
    license
  });
}

function clean(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}
