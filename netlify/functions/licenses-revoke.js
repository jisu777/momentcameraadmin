const { json, parseBody, requireAdmin, updateLicense } = require("./shared-license");

exports.handler = async (event) => {
  try {
    const denied = requireAdmin(event);
    if (denied) return denied;
    const body = parseBody(event);
    const id = String(body.id || "");
    const status = body.status === "active" ? "active" : "revoked";
    if (!id) return json(400, { ok: false, error: "라이선스 ID가 없습니다." });
    const license = await updateLicense(id, { status });
    return json(200, { ok: true, license });
  } catch (error) {
    return json(500, { ok: false, error: error.message || "상태 변경에 실패했습니다." });
  }
};
