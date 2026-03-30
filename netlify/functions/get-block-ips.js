const { json, requireAdmin, getRepoFile } = require("./utils");

const BLOCK_IP_LOG_PATH = process.env.BLOCK_IP_LOG_PATH || "data/block-ips.json";

exports.handler = async (event) => {
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    let content = "[]";

    try {
      const file = await getRepoFile(BLOCK_IP_LOG_PATH);
      content = file.content || "[]";
    } catch (err) {
      content = "[]";
    }

    let logs = [];
    try {
      logs = JSON.parse(content || "[]");
    } catch {
      logs = [];
    }

    if (!Array.isArray(logs)) logs = [];

    logs.sort((a, b) => {
      const ta = new Date(a?.lastSeen || a?.time || 0).getTime();
      const tb = new Date(b?.lastSeen || b?.time || 0).getTime();
      return tb - ta;
    });

    return json(200, { logs });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load blocked IP logs" });
  }
};
