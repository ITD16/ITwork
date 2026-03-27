const {
  json,
  requireAdmin,
  readUsersFromRepo,
  writeUsersToRepo,
  makeRandomPassword,
  hashPassword,
  requireSameOrigin,
} = require("./utils");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const originCheck = requireSameOrigin(event);
  if (!originCheck.ok) return originCheck.response;

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const { username } = JSON.parse(event.body || "{}");
    const cleanUsername = String(username || "").trim();

    if (!cleanUsername) {
      return json(400, { error: "Missing username" });
    }

    const { sha, users } = await readUsersFromRepo();

    const existed = users.find(
      (x) =>
        String(x.username || "").toLowerCase() === cleanUsername.toLowerCase(),
    );

    if (existed) {
      return json(400, { error: "Username already exists" });
    }

    const tempPassword = makeRandomPassword(10);
    const passwordHash = await hashPassword(tempPassword);

    users.push({
      username: cleanUsername,
      passwordHash,
      role: "user",
      active: true,
      mustChangePassword: true,
      permissions: {
        contentidol: true,
        contentidolSettings: true,
        domains1b: true,
        domains789: true,
        domains0b: true,
        vmixConfig: true,
      },
    });

    await writeUsersToRepo(
      users,
      sha,
      `add user ${cleanUsername} by ${auth.session.username}`,
    );

    return json(200, {
      ok: true,
      username: cleanUsername,
      tempPassword,
      mustChangePassword: true,
    });
  } catch (err) {
    return json(500, {
      error: err.message || "Add user failed",
    });
  }
};
