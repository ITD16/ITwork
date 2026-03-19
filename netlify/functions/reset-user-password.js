const crypto = require("crypto");
const bcrypt = require("bcryptjs");

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
  const token = cookies["cfg_admin_session"];
  return verifySession(token);
}

function requireAdmin(event) {
  const session = getSession(event);
  if (!session) {
    return { ok: false, response: json(401, { error: "Unauthorized" }) };
  }
  if ((session.role || "user") !== "admin") {
    return { ok: false, response: json(403, { error: "Forbidden" }) };
  }
  return { ok: true, session };
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

  if (!owner || !repo) throw new Error("Missing GITHUB_OWNER or GITHUB_REPO");
  return { owner, repo, branch };
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

async function readUsersFromRepo() {
  const file = await getRepoFile("data/users.json");
  return {
    sha: file.sha,
    users: JSON.parse(file.content || "[]")
  };
}

async function writeUsersToRepo(users, sha, message = "update users.json") {
  const content = JSON.stringify(users, null, 2) + "\n";
  return putRepoFile("data/users.json", content, message, sha);
}

function makeRandomPassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789@#$";
  let out = "";
  for (let i = 0; i < length; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

async function hashPassword(password) {
  return bcrypt.hash(String(password), 10);
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const { username } = JSON.parse(event.body || "{}");
    if (!username) return json(400, { error: "Missing username" });

    const { sha, users } = await readUsersFromRepo();
    const user = users.find(x => x.username === username);

    if (!user) return json(404, { error: "User not found" });

    const tempPassword = makeRandomPassword(10);
    user.passwordHash = await hashPassword(tempPassword);
    user.mustChangePassword = true;
    delete user.password;

    await writeUsersToRepo(
      users,
      sha,
      `reset password for ${username} by ${auth.session.username}`
    );

    return json(200, {
      ok: true,
      username,
      tempPassword,
      mustChangePassword: true
    });
  } catch (err) {
    return json(500, {
      error: err.message || "Reset password failed"
    });
  }
};