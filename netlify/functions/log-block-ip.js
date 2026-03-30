const { json, getRepoFile, putRepoFile } = require("./utils");

const BLOCK_IP_LOG_PATH = process.env.BLOCK_IP_LOG_PATH || "data/block-ips.json";
const MAX_LOGS = Number(process.env.BLOCK_IP_LOG_MAX || 500);
const BLOCK_THRESHOLD = Math.max(2, Number(process.env.BLOCK_IP_THRESHOLD || 3));

function isAuthorized(event) {
  const expected = String(process.env.BLOCK_IP_LOG_SECRET || "").trim();
  if (!expected) return false;

  const actual = String(
    event.headers["x-block-ip-secret"] ||
      event.headers["X-Block-Ip-Secret"] ||
      "",
  ).trim();

  return actual && actual === expected;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  if (!isAuthorized(event)) {
    return json(403, { error: "Forbidden" });
  }

  try {
    const body = JSON.parse(event.body || "{}");
    const nowIso = body.time || new Date().toISOString();
    const ip = String(body.ip || "").trim() || "unknown";

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

    const existing = logs.find((x) => String(x?.ip || "") === ip);

    if (existing) {
      existing.attempts = Number(existing.attempts || 0) + 1;
      existing.lastSeen = nowIso;
      existing.path = String(body.path || existing.path || "/").trim() || "/";
      existing.referer = String(body.referer || existing.referer || "").trim();
      existing.userAgent = String(body.userAgent || existing.userAgent || "").trim();
      existing.country = String(body.country || existing.country || "").trim();

      if (!existing.blocked && existing.attempts >= BLOCK_THRESHOLD) {
        existing.blocked = true;
        existing.blockedAt = nowIso;
      }
    } else {
      logs.unshift({
        ip,
        attempts: 1,
        blocked: false,
        firstSeen: nowIso,
        lastSeen: nowIso,
        blockedAt: "",
        path: String(body.path || "/").trim() || "/",
        referer: String(body.referer || "").trim(),
        userAgent: String(body.userAgent || "").trim(),
        country: String(body.country || "").trim(),
      });
    }

    logs.sort((a, b) => {
      const ta = new Date(a?.lastSeen || a?.time || 0).getTime();
      const tb = new Date(b?.lastSeen || b?.time || 0).getTime();
      return tb - ta;
    });
    logs = logs.slice(0, MAX_LOGS);

    await putRepoFile(
      BLOCK_IP_LOG_PATH,
      JSON.stringify(logs, null, 2) + "\n",
      `track blocked ip ${ip}`,
      sha,
    );

    const row = logs.find((x) => String(x?.ip || "") === ip) || null;

    return json(200, {
      ok: true,
      threshold: BLOCK_THRESHOLD,
      ip,
      blocked: !!row?.blocked,
      attempts: Number(row?.attempts || 0),
    });
  } catch (err) {
    return json(500, { error: err.message || "Cannot log blocked ip" });
  }
};
