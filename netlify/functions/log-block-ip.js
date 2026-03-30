const { json, getRepoFile } = require("./utils");

const BLOCK_IP_LOG_PATH =
  process.env.BLOCK_IP_LOG_PATH || "data/block-ips.json";
const BLOCK_IP_STORE_NAME = process.env.BLOCK_IP_STORE_NAME || "security-logs";
const BLOCK_IP_STORE_KEY = process.env.BLOCK_IP_STORE_KEY || "blocked-ips";
const MAX_LOGS = Number(process.env.BLOCK_IP_LOG_MAX || 500);
const BLOCK_THRESHOLD = Math.max(
  2,
  Number(process.env.BLOCK_IP_THRESHOLD || 3),
);

let _getStore = null;

async function getBlobsGetStore() {
  if (_getStore) return _getStore;
  const mod = await import("@netlify/blobs");
  _getStore = mod.getStore;
  return _getStore;
}

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

async function getBlockIpStore() {
  const getStore = await getBlobsGetStore();
  return getStore({ name: BLOCK_IP_STORE_NAME, consistency: "strong" });
}

async function readLegacyRepoLogs() {
  try {
    const file = await getRepoFile(BLOCK_IP_LOG_PATH);
    const logs = JSON.parse(file.content || "[]");
    return Array.isArray(logs) ? logs : [];
  } catch {
    return [];
  }
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

    const store = await getBlockIpStore();
    let logs = await store.get(BLOCK_IP_STORE_KEY, {
      type: "json",
      consistency: "strong",
    });

    if (!Array.isArray(logs)) {
      logs = await readLegacyRepoLogs();
    }
    if (!Array.isArray(logs)) logs = [];

    const existing = logs.find((x) => String(x?.ip || "") === ip);

    if (existing) {
      existing.attempts = Number(existing.attempts || 0) + 1;
      existing.lastSeen = nowIso;
      existing.path = String(body.path || existing.path || "/").trim() || "/";
      existing.referer = String(body.referer || existing.referer || "").trim();
      existing.userAgent = String(
        body.userAgent || existing.userAgent || "",
      ).trim();
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

    await store.setJSON(BLOCK_IP_STORE_KEY, logs);

    const row = logs.find((x) => String(x?.ip || "") === ip) || null;

    return json(200, {
      ok: true,
      threshold: BLOCK_THRESHOLD,
      ip,
      blocked: !!row?.blocked,
      attempts: Number(row?.attempts || 0),
      storage: "netlify-blobs",
    });
  } catch (err) {
    return json(500, { error: err.message || "Cannot log blocked ip" });
  }
};
