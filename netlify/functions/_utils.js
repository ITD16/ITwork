const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const COOKIE_NAME = "cfg_admin_session";

function getUsersPath() {
  const p1 = path.join(process.cwd(), "data", "users.json");
  const p2 = path.join(__dirname, "..", "..", "data", "users.json");

  if (fs.existsSync(p1)) return p1;
  if (fs.existsSync(p2)) return p2;
  return p1;
}

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    },
    body: JSON.stringify(body)
  };
}

function parseCookies(event) {
  const raw = event.headers.cookie || event.headers.Cookie || "";
  const out = {};
  raw.split(";").forEach(part => {
    const [k, ...v] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(v.join("="));
  });
  return out;
}

function signValue(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function getClientIp(event) {
  return (
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["client-ip"] ||
    event.headers["x-forwarded-for"] ||
    ""
  ).split(",")[0].trim();
}

function makeSession(user, extra = {}) {
  const secret = process.env.AUTH_SECRET || "change-this-secret";
  const payload = JSON.stringify({
    username: user.username,
    role: user.role || "user",
    ip: extra.ip || "",
    deviceInfo: extra.deviceInfo || "",
    exp: Date.now() + 1000 * 60 * 60 * 12
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const sig = signValue(encoded, secret);
  return `${encoded}.${sig}`;
}

function verifySession(token) {
  if (!token || !token.includes(".")) return null;

  const secret = process.env.AUTH_SECRET || "change-this-secret";
  const [encoded, sig] = token.split(".");
  const expected = signValue(encoded, secret);

  if (sig !== expected) return null;

  const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  if (!payload.exp || payload.exp < Date.now()) return null;

  return payload;
}

function getSession(event) {
  const cookies = parseCookies(event);
  const token = cookies[COOKIE_NAME];
  return verifySession(token);
}

function authRequired(event) {
  const session = getSession(event);
  if (!session) {
    return { ok: false, response: json(401, { error: "Unauthorized" }) };
  }
  return { ok: true, session };
}

function setSessionCookie(user, extra = {}) {
  const token = makeSession(user, extra);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

function readUsers() {
  const text = fs.readFileSync(getUsersPath(), "utf8");
  return JSON.parse(text);
}

async function githubRequest(url, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) throw new Error("Missing GITHUB_TOKEN");

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `GitHub API error ${res.status}`);
  return data;
}

function repoInfo() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const configPath = process.env.CONFIG_PATH || "config.json";
  const logPath = process.env.LOG_PATH || "data/change_logs.jsonl";

  if (!owner || !repo) throw new Error("Missing GITHUB_OWNER or GITHUB_REPO");
  return { owner, repo, branch, configPath, logPath };
}

async function getRepoFile(filePath) {
  const { owner, repo, branch } = repoInfo();
  const safePath = filePath.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${safePath}?ref=${encodeURIComponent(branch)}`;
  const data = await githubRequest(url);
  const content = Buffer.from(data.content || "", "base64").toString("utf8");
  return { sha: data.sha, content };
}

async function putRepoFile(filePath, content, message, sha) {
  const { owner, repo, branch } = repoInfo();
  const safePath = filePath.split("/").map(encodeURIComponent).join("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/contents/${safePath}`;

  const body = {
    message,
    content: Buffer.from(content, "utf8").toString("base64"),
    branch
  };

  if (sha) body.sha = sha;

  return githubRequest(url, {
    method: "PUT",
    body: JSON.stringify(body)
  });
}

module.exports = {
  json,
  readUsers,
  setSessionCookie,
  clearSessionCookie,
  authRequired,
  getRepoFile,
  putRepoFile,
  repoInfo,
  getClientIp
};
