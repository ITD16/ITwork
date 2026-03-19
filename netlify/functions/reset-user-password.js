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

function makeSession(user, extra = {}) {
  const secret = process.env.AUTH_SECRET || "change-this-secret";
  const payload = JSON.stringify({
    username: user.username,
    role: user.role || "user",
    mustChangePassword: !!user.mustChangePassword,
    ip: extra.ip || "",
    deviceInfo: extra.deviceInfo || "",
    exp: Date.now() + 1000 * 60 * 60 * 12
  });
  const encoded = Buffer.from(payload, "utf8").toString("base64url");
  const sig = signValue(encoded, secret);
  return `${encoded}.${sig}`;
}

function setSessionCookie(user, extra = {}) {
  const token = makeSession(user, extra);
  return `cfg_admin_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Secure`;
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

function authRequired(event) {
  const session = getSession(event);
  if (!session) {
    return { ok: false, response: json(401, { error: "Unauthorized" }) };
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

async function hashPassword(password) {
  return bcrypt.hash(String(password), 10);
}

async function verifyPassword(password, passwordHash) {
  if (!passwordHash) return false;
  return bcrypt.compare(String(password), String(passwordHash));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const auth = authRequired(event);
  if (!auth.ok) return auth.response;

  try {
    const { currentPassword, newPassword, confirmPassword } = JSON.parse(event.body || "{}");

    if (!newPassword || !confirmPassword) {
      return json(400, { error: "Missing password fields" });
    }

    if (newPassword !== confirmPassword) {
      return json(400, { error: "Confirm password does not match" });
    }

    if (String(newPassword).length < 6) {
      return json(400, { error: "Password must be at least 6 characters" });
    }

    const { sha, users } = await readUsersFromRepo();
    const user = users.find(x => x.username === auth.session.username);

    if (!user) return json(404, { error: "User not found" });

    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return json(400, { error: "Current password is required" });
      }

      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) {
        return json(401, { error: "Current password is incorrect" });
      }
    }

    const sameAsOld = await verifyPassword(newPassword, user.passwordHash);
    if (sameAsOld) {
      return json(400, { error: "New password must be different" });
    }

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    delete user.password;

    await writeUsersToRepo(
      users,
      sha,
      `change password for ${user.username}`
    );

    return json(
      200,
      { ok: true, mustChangePassword: false },
      {
        "Set-Cookie": setSessionCookie(user, {
          ip: auth.session.ip || "",
          deviceInfo: auth.session.deviceInfo || ""
        })
      }
    );
  } catch (err) {
    return json(500, { error: err.message || "Change password failed" });
  }
};