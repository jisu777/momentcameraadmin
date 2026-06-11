export type LicenseStatus = "active" | "revoked";

export type LicenseCode = {
  id: string;
  code: string;
  normalizedCode: string;
  status: LicenseStatus;
  maxActivations: number;
  activationCount: number;
  boundDeviceId: string | null;
  platform: string | null;
  appVersion: string | null;
  note: string | null;
  purchaserEmail: string | null;
  purchaserName: string | null;
  orderId: string | null;
  source: string | null;
  durationDays: number | null;
  expiresAt: string | null;
  createdAt: string;
  activatedAt: string | null;
  lastSeenAt: string | null;
};

export type PublicActivation = {
  ok: boolean;
  reason?: string;
  licenseId?: string;
  activatedAt?: string;
  expiresAt?: string | null;
  issuer?: string;
};
