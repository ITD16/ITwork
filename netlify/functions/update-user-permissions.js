const {
  json,
  requireAdmin,
  readUsersFromRepo,
  writeUsersToRepo,
} = require("./utils");

function normalizePermissions(perms = {}) {
  return {
    contentidol: perms.contentidol !== false,
    contentidolSettings: perms.contentidolSettings !== false,
    domains1b: perms.domains1b !== false,
    domains789: perms.domains789 !== false,
    domains0b: perms.domains0b !== false,
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const { username, permissions } = JSON.parse(event.body || "{}");
    const cleanUsername = String(username || "").trim();

    if (!cleanUsername) {
      return json(400, { error: "Missing username" });
    }

    const { sha, users } = await readUsersFromRepo();
    const user = users.find((u) => u.username === cleanUsername);

    if (!user) {
      return json(404, { error: "User not found" });
    }

    if ((user.role || "user") === "admin") {
      return json(400, { error: "Cannot change admin permissions" });
    }

    user.permissions = normalizePermissions(permissions);

    await writeUsersToRepo(
      users,
      sha,
      `update permissions for ${cleanUsername} by ${auth.session.username}`,
    );

    return json(200, {
      ok: true,
      username: cleanUsername,
      permissions: user.permissions,
    });
  } catch (err) {
    return json(500, { error: err.message || "Update permissions failed" });
  }
};
