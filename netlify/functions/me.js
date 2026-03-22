const { json, authRequired, readUsersFromRepo } = require("./utils");

function normalizePermissions(user) {
  if ((user?.role || "user") === "admin") {
    return {
      contentidol: true,
      contentidolSettings: true,
      domains1b: true,
      domains789: true,
      domains0b: true,
    };
  }

  return {
    contentidol: user?.permissions?.contentidol !== false,
    contentidolSettings: user?.permissions?.contentidolSettings !== false,
    domains1b: user?.permissions?.domains1b !== false,
    domains789: user?.permissions?.domains789 !== false,
    domains0b: user?.permissions?.domains0b !== false,
  };
}

exports.handler = async (event) => {
  const auth = authRequired(event);
  if (!auth.ok) return auth.response;

  try {
    const { users } = await readUsersFromRepo();
    const me = users.find((u) => u.username === auth.session.username);

    return json(200, {
      username: auth.session.username,
      role: auth.session.role || "user",
      mustChangePassword: !!auth.session.mustChangePassword,
      permissions: normalizePermissions(
        me || {
          username: auth.session.username,
          role: auth.session.role || "user",
        },
      ),
    });
  } catch (err) {
    return json(500, {
      error: err.message || "Cannot load profile",
    });
  }
};
