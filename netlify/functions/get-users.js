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
        permissions:
          u.role === "admin"
            ? {
                contentidol: true,
                contentidolSettings: true,
                domains1b: true,
                domains789: true,
                domains0b: true,
                domains52b: true,
                webscam1b: true,
                webscam0b: true,
                vmixConfig: true,
                vmixConfig2: true,
              }
            : {
                contentidol: !!u.permissions?.contentidol,
                contentidolSettings: !!u.permissions?.contentidolSettings,
                domains1b: !!u.permissions?.domains1b,
                domains789: !!u.permissions?.domains789,
                domains0b: !!u.permissions?.domains0b,
                domains52b: !!u.permissions?.domains52b,
                webscam1b: !!u.permissions?.webscam1b,
                webscam0b: !!u.permissions?.webscam0b,
                vmixConfig: !!u.permissions?.vmixConfig,
                vmixConfig2: !!u.permissions?.vmixConfig2,
              },
      })),
    });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load users" });
  }
};
