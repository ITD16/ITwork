const {
  json,
  setSessionCookie,
  getClientIp,
  verifyPassword,
  readUsersFromRepo,
  requireSameOrigin,
} = require("./utils");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }
  const originCheck = requireSameOrigin(event);
  if (!originCheck.ok) return originCheck.response;

  try {
    const { username, password, deviceInfo } = JSON.parse(event.body || "{}");

    const { users } = await readUsersFromRepo();

    const found = users.find(
      (x) => x.username === username && x.active !== false,
    );

    if (!found) {
      return json(401, { error: "Invalid username or password" });
    }

    const ok = await verifyPassword(password, found.passwordHash);
    if (!ok) {
      return json(401, { error: "Invalid username or password" });
    }

    const ip = getClientIp(event);

    return json(
      200,
      {
        ok: true,
        username: found.username,
        role: found.role || "user",
        mustChangePassword: !!found.mustChangePassword,
      },
      {
        "Set-Cookie": setSessionCookie(found, {
          ip,
          deviceInfo: String(deviceInfo || "").trim(),
        }),
      },
    );
  } catch (err) {
    return json(500, { error: err.message || "Login error" });
  }
};
