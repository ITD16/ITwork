const {
  json,
  requireAdmin,
  readUsersFromRepo,
  writeUsersToRepo,
  requireSameOrigin,
} = require("./utils");

function normalizePermissions(perms = {}) {
  return {
    contentidol: !!perms.contentidol,
    contentidolSettings: !!perms.contentidolSettings,
    domains1b: !!perms.domains1b,
    domains789: !!perms.domains789,
    domains0b: !!perms.domains0b,
    domains52b: !!perms.domains52b,
    webscam1b: !!perms.webscam1b,
    webscam0b: !!perms.webscam0b,
    vmixConfig: !!perms.vmixConfig,
    vmixConfig0: !!perms.vmixConfig0,
    vmixConfig2: !!perms.vmixConfig2,
  };
}

async function applyPermissionsOnce(username, permissions, actor) {
  const { sha, users } = await readUsersFromRepo();
  const user = users.find((u) => u.username === username);

  if (!user) {
    return { ok: false, status: 404, body: { error: "User not found" } };
  }

  if ((user.role || "user") === "admin") {
    return {
      ok: false,
      status: 400,
      body: { error: "Cannot change admin permissions" },
    };
  }

  user.permissions = normalizePermissions(permissions);

  await writeUsersToRepo(
    users,
    sha,
    `update permissions for ${username} by ${actor}`,
  );

  return {
    ok: true,
    body: {
      ok: true,
      username,
      permissions: user.permissions,
    },
  };
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
    const { username, permissions } = JSON.parse(event.body || "{}");
    const cleanUsername = String(username || "").trim();

    if (!cleanUsername) {
      return json(400, { error: "Missing username" });
    }

    try {
      const result = await applyPermissionsOnce(
        cleanUsername,
        permissions,
        auth.session.username,
      );

      if (!result.ok) {
        return json(result.status, result.body);
      }

      return json(200, result.body);
    } catch (err) {
      const msg = String(err.message || "");

      if (msg.includes("does not match")) {
        const retryResult = await applyPermissionsOnce(
          cleanUsername,
          permissions,
          auth.session.username,
        );

        if (!retryResult.ok) {
          return json(retryResult.status, retryResult.body);
        }

        return json(200, retryResult.body);
      }

      throw err;
    }
  } catch (err) {
    return json(500, { error: err.message || "Update permissions failed" });
  }
};
