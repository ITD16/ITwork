const { json, requireAdmin, readUsersFromRepo } = require("./utils");

exports.handler = async (event) => {
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;

  try {
    const { users } = await readUsersFromRepo();

    return json(200, {
      users: users.map((u) => ({
        username: u.username,
        role: u.role || "user",
        active: u.active !== false,
        mustChangePassword: !!u.mustChangePassword,
        permissions: {
          contentidol:
            u.role === "admin" ? true : u.permissions?.contentidol !== false,
          contentidolSettings:
            u.role === "admin"
              ? true
              : u.permissions?.contentidolSettings !== false,
          domains1b:
            u.role === "admin" ? true : u.permissions?.domains1b !== false,
          domains789:
            u.role === "admin" ? true : u.permissions?.domains789 !== false,
          domains0b:
            u.role === "admin" ? true : u.permissions?.domains0b !== false,
          vmixConfig:
            u.role === "admin" ? true : u.permissions?.vmixConfig !== false,
        },
      })),
    });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load users" });
  }
};
