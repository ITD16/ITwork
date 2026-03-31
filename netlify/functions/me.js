const { json, authRequired, readUsersFromRepo } = require("./utils");

function normalizeAllowedPanels(user) {
  if ((user?.role || "user") === "admin") {
    return [
      "contentidol",
      "contentidolSettings",
      "domains1b",
      "domains789",
      "domains0b",
      "webscam1b",
      "webscam0b",
      "vmixConfig",
      "vmixConfig2",
    ];
  }

  const out = [];
  const p = user?.permissions || {};

  if (!!p.contentidol) out.push("contentidol");
  if (!!p.contentidolSettings) out.push("contentidolSettings");
  if (!!p.domains1b) out.push("domains1b");
  if (!!p.domains789) out.push("domains789");
  if (!!p.domains0b) out.push("domains0b");
  if (!!p.webscam1b) out.push("webscam1b");
  if (!!p.webscam0b) out.push("webscam0b");
  if (!!p.vmixConfig) out.push("vmixConfig");
  if (!!p.vmixConfig2) out.push("vmixConfig2");

  return out;
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
      allowedPanels: normalizeAllowedPanels(
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
