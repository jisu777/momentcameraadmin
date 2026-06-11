import { NextRequest, NextResponse } from "next/server";

const DEFAULT_ADMIN_PASSWORD = "M0M3NTCAM3RA";

export function isAdminRequest(request: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;
  const provided = request.headers.get("x-admin-password");
  return Boolean(provided && provided === expected);
}

export function requireAdmin(request: NextRequest) {
  if (isAdminRequest(request)) {
    return null;
  }

  return NextResponse.json(
    { ok: false, error: "관리자 비밀번호가 올바르지 않습니다." },
    { status: 401 }
  );
}
