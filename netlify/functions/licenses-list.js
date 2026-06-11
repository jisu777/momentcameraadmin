const { json, requireAdmin, listLicenses } = require("./shared-license");

exports.handler = async (event) => {
  try {
    const denied = requireAdmin(event);
    if (denied) return denied;
    const licenses = await listLicenses();
    return json(200, { ok: true, licenses });
  } catch (error) {
    return json(500, { ok: false, error: error.message || "목록을 불러오지 못했습니다." });
  }
};
