const { json, requireAdmin, readUsersFromRepo } = require("./_utils");

exports.handler = async (event) => {
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const { users } = await readUsersFromRepo();

    return json(200, {
      users: users.map(u => ({
        username: u.username,
        role: u.role || "user",
        active: u.active !== false,
        mustChangePassword: !!u.mustChangePassword
      }))
    });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load users" });
  }
};