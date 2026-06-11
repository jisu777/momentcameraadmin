import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { createLicenseCode, normalizeCode } from "@/lib/code";
import { createLicense, insertLicenses, listLicenses } from "@/lib/license-store";

export async function POST(request: NextRequest) {
  try {
    const denied = requireAdmin(request);
    if (denied) return denied;

    const body = await request.json().catch(() => ({}));
    const count = Math.max(1, Math.min(Number(body.count ?? 100), 1000));
    const maxActivations = Math.max(1, Math.min(Number(body.maxActivations ?? 1), 20));
    const period = String(body.period ?? "unlimited");
    const { durationDays, expiresAt } = resolvePeriod(period, body.expiresAt);
    const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null;

    const existing = new Set((await listLicenses()).map((item) => item.normalizedCode));
    const created = [];
    const pending = new Set<string>();

    while (created.length < count) {
      const code = createLicenseCode();
      const normalizedCode = normalizeCode(code);
      if (existing.has(normalizedCode) || pending.has(normalizedCode)) {
        continue;
      }

      pending.add(normalizedCode);
      created.push(createLicense({ code, normalizedCode, maxActivations, durationDays, expiresAt, note }));
    }

    const saved = await insertLicenses(created);
    return NextResponse.json({ ok: true, count: saved.length, licenses: saved });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "코드 생성에 실패했습니다." },
      { status: 500 }
    );
  }
}

function resolvePeriod(period: string, customExpiresAt: unknown) {
  if (period === "unlimited") {
    return { durationDays: null, expiresAt: null };
  }

  if (period === "custom") {
    if (!customExpiresAt) {
      throw new Error("직접 만료일을 선택해야 합니다.");
    }
    return { durationDays: null, expiresAt: new Date(String(customExpiresAt)).toISOString() };
  }

  const days = Number(period);
  if (![7, 30, 365].includes(days)) {
    throw new Error("라이선스 기간이 올바르지 않습니다.");
  }

  return { durationDays: days, expiresAt: null };
}
