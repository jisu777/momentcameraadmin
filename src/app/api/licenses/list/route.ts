import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { listLicenses } from "@/lib/license-store";

export async function GET(request: NextRequest) {
  const denied = requireAdmin(request);
  if (denied) return denied;

  const licenses = await listLicenses();
  return NextResponse.json({ ok: true, licenses });
}
