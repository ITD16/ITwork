const crypto = require("crypto");
const bcrypt = require("bcryptjs");

const COOKIE_NAME = "cfg_admin_session";
const USERS_REPO_PATH = "data/users.json";

function json(statusCode, body, extraHeaders = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
    body: JSON.stringify(body),
  };
}

function getAuthSecret() {
  const secret = String(process.env.AUTH_SECRET || "").trim();

  if (!secret) {
    throw new Error("Missing AUTH_SECRET");
  }

  if (secret === "change-this-secret") {
    throw new Error("AUTH_SECRET must not use the default insecure value");
  }

  if (secret.length < 32) {
    throw new Error("AUTH_SECRET must be at least 32 characters");
  }

  return secret;
}

function parseCookies(event) {
  const raw = event.headers.cookie || event.headers.Cookie || "";
  const out = {};
  raw.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(v.join("="));
  });
  return out;
}

function signValue(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("hex");
}

function safeEqualString(a, b) {
  const aBuf = Buffer.from(String(a), "utf8");
  const bBuf = Buffer.from(String(b), "utf8");

  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function getClientIp(event) {
  return (
    event.headers["x-nf-client-connection-ip"] ||
    event.headers["client-ip"] ||
    event.headers["x-forwarded-for"] ||
    ""
  )
    .split(",")[0]
    .trim();
}

function getRequestOrigin(event) {
  const proto =
    event.headers["x-forwarded-proto"] ||
    event.headers["x-forwarded-protocol"] ||
    "https";

  const host =
    event.headers["x-forwarded-host"] ||
    event.headers.host ||
    event.headers.Host ||
    "";

  if (!host) return "";
  return `${proto}://${host}`;
}

function extractOrigin(value) {
  try {
    if (!value) return "";
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function requireSameOrigin(event) {
  const method = String(event.httpMethod || "GET").toUpperCase();

  if (["GET", "HEAD", "OPTIONS"].includes(method)) {
    return { ok: true };
  }

  const allowedOrigin = getRequestOrigin(event);
  if (!allowedOrigin) {
    return {
      ok: false,
      response: json(403, {
        error: "Forbidden: cannot determine request origin",
      }),
    };
  }

  const originHeader = event.headers.origin || event.headers.Origin || "";
  const refererHeader = event.headers.referer || event.headers.Referer || "";
  const secFetchSite =
    event.headers["sec-fetch-site"] || event.headers["Sec-Fetch-Site"] || "";

  const origin = extractOrigin(originHeader);
  const refererOrigin = extractOrigin(refererHeader);

  if (origin) {
    if (origin === allowedOrigin) return { ok: true };
    return {
      ok: false,
      response: json(403, { error: "Forbidden: bad origin" }),
    };
  }

  if (refererOrigin) {
    if (refererOrigin === allowedOrigin) return { ok: true };
    return {
      ok: false,
      response: json(403, { error: "Forbidden: bad referer" }),
    };
  }

  if (
    secFetchSite === "same-origin" ||
    secFetchSite === "same-site" ||
    secFetchSite === "none"
  ) {
    return { ok: true };
  }

  return {
    ok: false,
    response: json(403, { error: "Forbidden: missing origin" }),
  };
}

function makeSession(user, extra = {}) {
  const secret = getAuthSecret();
  const payload = JSON.stringify({
    username: user.username,
    role: user.role || "user",
    mustChangePassword: !!user.mustChangePassword,
    ip: extra.ip || "",
    deviceInfo: extra.deviceInfo || "",
    exp: Date.now() + 1000 * 60 * 60 * 12,
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const sig = signValue(encoded, secret);
  return `${encoded}.${sig}`;
}

function verifySession(token) {
  if (!token || !token.includes(".")) return null;

  const secret = getAuthSecret();
  const [encoded, sig] = token.split(".");
  const expected = signValue(encoded, secret);

  if (!safeEqualString(sig, expected)) return null;

  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  );
  if (!payload.exp || payload.exp < Date.now()) return null;

  return payload;
}

function getSession(event) {
  const cookies = parseCookies(event);
  const token = cookies[COOKIE_NAME];
  return verifySession(token);
}

function authRequired(event) {
  let session = null;

  try {
    session = getSession(event);
  } catch (err) {
    return { ok: false, response: json(500, { error: err.message }) };
  }

  if (!session) {
    return { ok: false, response: json(401, { error: "Unauthorized" }) };
  }
  return { ok: true, session };
}

function requireAdmin(event) {
  const auth = authRequired(event);
  if (!auth.ok) return auth;
  if ((auth.session.role || "user") !== "admin") {
    return { ok: false, response: json(403, { error: "Forbidden" }) };
  }
  return auth;
}

function setSessionCookie(user, extra = {}) {
  const token = makeSession(user, extra);
  return `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=43200`;
}

function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`;
}

async function hashPassword(password) {
  return bcrypt.hash(String(password), 10);
}

async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(String(password), String(passwordHash));
}

function makeRandomPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
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
      ...(options.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || `GitHub API error ${res.status}`);
  }
  return data;
}

function repoInfo() {
  const owner = process.env.GITHUB_OWNER;
  const repo = process.env.GITHUB_REPO;
  const branch = process.env.GITHUB_BRANCH || "main";
  const configPath = process.env.CONFIG_PATH || "config.json";
  const vmixConfigPath =
    process.env.VMIX_CONFIG_PATH || "data/vmix-domg1-config.json";
  const vmixConfig0Path =
    process.env.VMIX_CONFIG0_PATH || "data/vmix-domg0-config.json";
  const vmixConfig2Path =
    process.env.VMIX_CONFIG2_PATH || "data/vmix-config2.json";
  const logPath = process.env.LOG_PATH || "data/change_logs.jsonl";

  if (!owner || !repo) {
    throw new Error("Missing GITHUB_OWNER or GITHUB_REPO");
  }

  return {
    owner,
    repo,
    branch,
    configPath,
    vmixConfigPath,
    vmixConfig0Path,
    vmixConfig2Path,
    logPath,
  };
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
    branch,
  };

  if (sha) body.sha = sha;

  return githubRequest(url, {
    method: "PUT",
    body: JSON.stringify(body),
  });
}

async function readUsersFromRepo() {
  const file = await getRepoFile(USERS_REPO_PATH);
  return {
    sha: file.sha,
    users: JSON.parse(file.content || "[]"),
  };
}

async function writeUsersToRepo(users, sha, message = "update users.json") {
  const content = JSON.stringify(users, null, 2) + "\n";
  return putRepoFile(USERS_REPO_PATH, content, message, sha);
}

module.exports = {
  json,
  setSessionCookie,
  clearSessionCookie,
  authRequired,
  requireAdmin,
  requireSameOrigin,
  getRepoFile,
  putRepoFile,
  repoInfo,
  getClientIp,
  makeRandomPassword,
  hashPassword,
  verifyPassword,
  readUsersFromRepo,
  writeUsersToRepo,
};
