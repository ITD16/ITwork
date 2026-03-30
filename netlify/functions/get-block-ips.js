const { json, requireAdmin, getRepoFile } = require("./utils");

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

  const siteID = String(process.env.NETLIFY_BLOBS_SITE_ID || "").trim();
  const token = String(process.env.NETLIFY_BLOBS_TOKEN || "").trim();

  if (!siteID || !token) {
    throw new Error("Missing NETLIFY_BLOBS_SITE_ID or NETLIFY_BLOBS_TOKEN");
  }

  return getStore({
    name: BLOCK_IP_STORE_NAME,
    consistency: "strong",
    siteID,
    token,
  });
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
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const store = await getBlockIpStore();
    let logs = await store.get(BLOCK_IP_STORE_KEY, {
      type: "json",
      consistency: "strong",
    });

    if (!Array.isArray(logs) || logs.length === 0) {
      logs = await readLegacyRepoLogs();
      if (Array.isArray(logs) && logs.length) {
        await store.setJSON(BLOCK_IP_STORE_KEY, logs);
      }
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
