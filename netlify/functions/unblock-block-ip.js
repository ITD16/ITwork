const {
  json,
  requireAdmin,
  requireSameOrigin,
  getRepoFile,
  putRepoFile,
} = require("./utils");

const BLOCK_IP_LOG_PATH = process.env.BLOCK_IP_LOG_PATH || "data/block-ips.json";

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const originCheck = requireSameOrigin(event);
  if (!originCheck.ok) return originCheck.response;

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const { ip } = JSON.parse(event.body || "{}");
    const targetIp = String(ip || "").trim();

    if (!targetIp) {
      return json(400, { error: "Missing ip" });
    }

    let sha = null;
    let logs = [];

    try {
      const file = await getRepoFile(BLOCK_IP_LOG_PATH);
      sha = file.sha;
      logs = JSON.parse(file.content || "[]");
      if (!Array.isArray(logs)) logs = [];
    } catch (err) {
      logs = [];
    }

    const nextLogs = logs.filter((x) => String(x?.ip || "") !== targetIp);

    await putRepoFile(
      BLOCK_IP_LOG_PATH,
      JSON.stringify(nextLogs, null, 2) + "\n",
      `unblock ip ${targetIp} by ${auth.session.username}`,
      sha,
    );

    return json(200, { ok: true, ip: targetIp });
  } catch (err) {
    return json(500, { error: err.message || "Cannot unblock ip" });
  }
};
