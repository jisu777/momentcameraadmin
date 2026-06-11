const { json, parseBody, requireAdmin, updateLicense } = require("./shared-license");

exports.handler = async (event) => {
  try {
    const denied = requireAdmin(event);
    if (denied) return denied;
    const body = parseBody(event);
    const id = String(body.id || "");
    if (!id) return json(400, { ok: false, error: "라이선스 ID가 없습니다." });
    const license = await updateLicense(id, {
      bound_device_id: null,
      activation_count: 0,
      activated_at: null,
      last_seen_at: null,
      platform: null,
      app_version: null
    });
    return json(200, { ok: true, license });
  } catch (error) {
    return json(500, { ok: false, error: error.message || "기기 해제에 실패했습니다." });
  }
};
