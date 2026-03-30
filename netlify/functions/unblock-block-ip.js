const {
  json,
  requireAdmin,
  requireSameOrigin,
  getRepoFile,
} = require("./utils");

const BLOCK_IP_LOG_PATH =
  process.env.BLOCK_IP_LOG_PATH || "data/block-ips.json";
const BLOCK_IP_STORE_NAME = process.env.BLOCK_IP_STORE_NAME || "security-logs";
const BLOCK_IP_STORE_KEY = process.env.BLOCK_IP_STORE_KEY || "blocked-ips";

let _getStore = null;

async function getBlobsGetStore() {
  if (_getStore) return _getStore;
  const mod = await import("@netlify/blobs");
  _getStore = mod.getStore;
  return _getStore;
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

    const store = await getBlockIpStore();
    let logs = await store.get(BLOCK_IP_STORE_KEY, {
      type: "json",
      consistency: "strong",
    });

    if (!Array.isArray(logs)) {
      logs = await readLegacyRepoLogs();
    }
    if (!Array.isArray(logs)) logs = [];

    const nextLogs = logs.filter((x) => String(x?.ip || "") !== targetIp);

    await store.setJSON(BLOCK_IP_STORE_KEY, nextLogs);

    return json(200, { ok: true, ip: targetIp, storage: "netlify-blobs" });
  } catch (err) {
    return json(500, { error: err.message || "Cannot unblock ip" });
  }
};
