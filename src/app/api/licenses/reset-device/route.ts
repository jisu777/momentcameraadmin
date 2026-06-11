import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { updateLicense } from "@/lib/license-store";

export async function POST(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const body = await request.json().catch(() => ({}));
  const id = String(body.id ?? "");

  if (!id) {
    return NextResponse.json({ ok: false, error: "라이선스 ID가 없습니다." }, { status: 400 });
  }

  const license = await updateLicense(id, {
    boundDeviceId: null,
    activationCount: 0,
    activatedAt: null,
    lastSeenAt: null,
    platform: null,
    appVersion: null
  });

  return NextResponse.json({ ok: true, license });
}
