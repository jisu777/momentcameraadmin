const { json, parseBody, normalizeCode, getByCode, updateLicense, addDays } = require("./shared-license");

exports.handler = async (event) => {
  try {
    const body = parseBody(event);
    const normalizedCode = normalizeCode(body.code);
    const deviceId = String(body.deviceId || "").trim();
    const platform = String(body.platform || "").trim().slice(0, 60) || null;
    const appVersion = String(body.appVersion || "").trim().slice(0, 60) || null;

    if (normalizedCode.length !== 16) return json(400, { ok: false, reason: "코드 형식이 올바르지 않습니다." });
    if (!deviceId) return json(400, { ok: false, reason: "기기 ID가 없습니다." });

    const license = await getByCode(normalizedCode);
    if (!license) return json(404, { ok: false, reason: "존재하지 않는 코드입니다." });
    if (license.status !== "active") return json(403, { ok: false, reason: "사용 중지된 코드입니다." });
    if (license.expiresAt && new Date(license.expiresAt).getTime() < Date.now()) {
      return json(403, { ok: false, reason: "만료된 코드입니다." });
    }
    if (license.boundDeviceId && license.boundDeviceId !== deviceId) {
      return json(403, { ok: false, reason: "이미 다른 기기에서 사용된 코드입니다." });
    }
    if (!license.boundDeviceId && license.activationCount >= license.maxActivations) {
      return json(403, { ok: false, reason: "사용 가능 횟수를 초과한 코드입니다." });
    }

    const now = new Date();
    const firstActivation = !license.boundDeviceId;
    const expiresAt = firstActivation && license.durationDays ? addDays(now, license.durationDays).toISOString() : license.expiresAt;
    const updated = await updateLicense(license.id, {
      bound_device_id: license.boundDeviceId || deviceId,
      activation_count: firstActivation ? license.activationCount + 1 : license.activationCount,
      activated_at: license.activatedAt || now.toISOString(),
      expires_at: expiresAt,
      last_seen_at: now.toISOString(),
      platform,
      app_version: appVersion
    });

    return json(200, {
      ok: true,
      licenseId: updated?.id || license.id,
      activatedAt: updated?.activatedAt || now.toISOString(),
      expiresAt: updated?.expiresAt || expiresAt,
      issuer: process.env.LICENSE_ISSUER || "Moment Camera"
    });
  } catch (error) {
    return json(500, { ok: false, reason: error.message || "라이선스 확인에 실패했습니다." });
  }
};
