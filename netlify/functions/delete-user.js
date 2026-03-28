const {
  json,
  authRequired,
  readUsersFromRepo,
  writeUsersToRepo,
  requireSameOrigin,
} = require("./utils");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const auth = authRequired(event);
  if (!auth.ok) return auth.response;

  const originCheck = requireSameOrigin(event);
  if (!originCheck.ok) return originCheck.response;

  try {
    const body = JSON.parse(event.body || "{}");
    const username = String(body.username || "").trim();

    if (!username) {
      return json(400, { error: "Missing username" });
    }

    const { users, sha } = await readUsersFromRepo();
    const currentUser = users.find((u) => u.username === auth.session.username);

    if (!currentUser || (currentUser.role || "user") !== "admin") {
      return json(403, { error: "Only admin can delete users" });
    }

    const targetUser = users.find((u) => u.username === username);
    if (!targetUser) {
      return json(404, { error: "User not found" });
    }

    if ((targetUser.role || "user") === "admin") {
      return json(403, { error: "Cannot delete admin user" });
    }

    if (username === auth.session.username) {
      return json(403, { error: "Cannot delete current login user" });
    }

    const nextUsers = users.filter((u) => u.username !== username);

    await writeUsersToRepo(
      nextUsers,
      sha,
      `delete user ${username} by ${auth.session.username}`,
    );

    return json(200, {
      ok: true,
      message: `Deleted user: ${username}`,
    });
  } catch (err) {
    return json(500, { error: err.message || "Delete user failed" });
  }
};
