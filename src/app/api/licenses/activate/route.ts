import { NextRequest, NextResponse } from "next/server";
import { normalizeCode } from "@/lib/code";
import { getLicenseByCode, updateLicense } from "@/lib/license-store";
import type { PublicActivation } from "@/lib/license-types";

export async function POST(request: NextRequest) {
  try {
  const body = await request.json().catch(() => ({}));
  const normalizedCode = normalizeCode(String(body.code ?? ""));
  const deviceId = String(body.deviceId ?? "").trim();
  const platform = String(body.platform ?? "").trim().slice(0, 60) || null;
  const appVersion = String(body.appVersion ?? "").trim().slice(0, 60) || null;

  if (normalizedCode.length !== 16) {
    return NextResponse.json<PublicActivation>({ ok: false, reason: "코드 형식이 올바르지 않습니다." }, { status: 400 });
  }

  if (!deviceId) {
    return NextResponse.json<PublicActivation>({ ok: false, reason: "기기 ID가 없습니다." }, { status: 400 });
  }

  const license = await getLicenseByCode(normalizedCode);
  if (!license) {
    return NextResponse.json<PublicActivation>({ ok: false, reason: "존재하지 않는 코드입니다." }, { status: 404 });
  }

  if (license.status !== "active") {
    return NextResponse.json<PublicActivation>({ ok: false, reason: "사용 중지된 코드입니다." }, { status: 403 });
  }

  if (license.expiresAt && new Date(license.expiresAt).getTime() < Date.now()) {
    return NextResponse.json<PublicActivation>({ ok: false, reason: "만료된 코드입니다." }, { status: 403 });
  }

  if (license.boundDeviceId && license.boundDeviceId !== deviceId) {
    return NextResponse.json<PublicActivation>({ ok: false, reason: "이미 다른 기기에서 사용된 코드입니다." }, { status: 403 });
  }

  if (!license.boundDeviceId && license.activationCount >= license.maxActivations) {
    return NextResponse.json<PublicActivation>({ ok: false, reason: "사용 가능 횟수를 초과한 코드입니다." }, { status: 403 });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const firstActivation = !license.boundDeviceId;
  const calculatedExpiresAt = firstActivation && license.durationDays
    ? addDays(now, license.durationDays).toISOString()
    : license.expiresAt;

  const updated = await updateLicense(license.id, {
    boundDeviceId: license.boundDeviceId ?? deviceId,
    activationCount: firstActivation ? license.activationCount + 1 : license.activationCount,
    activatedAt: license.activatedAt ?? nowIso,
    expiresAt: calculatedExpiresAt,
    lastSeenAt: nowIso,
    platform,
    appVersion
  });

  return NextResponse.json<PublicActivation>({
    ok: true,
    licenseId: updated?.id ?? license.id,
    activatedAt: updated?.activatedAt ?? nowIso,
    expiresAt: updated?.expiresAt ?? calculatedExpiresAt,
    issuer: process.env.LICENSE_ISSUER ?? "Moment Camera"
  });
  } catch (error) {
    return NextResponse.json<PublicActivation>(
      { ok: false, reason: error instanceof Error ? error.message : "라이선스 확인에 실패했습니다." },
      { status: 500 }
    );
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
