const {
  json,
  authRequired,
  getRepoFile,
  repoInfo,
  readUsersFromRepo,
} = require("./utils");

function getUserPermissions(user) {
  if (!user || (user.role || "user") === "admin") {
    return {
      isAdmin: true,
      contentidol: true,
      contentidolSettings: true,
      domains1b: true,
      domains789: true,
      domains0b: true,
      enableFirework: true,
    };
  }

  const p = user.permissions || {};

  return {
    isAdmin: false,
    contentidol: p.contentidol !== false,
    contentidolSettings: p.contentidolSettings !== false,
    domains1b: p.domains1b !== false,
    domains789: p.domains789 !== false,
    domains0b: p.domains0b !== false,
    enableFirework: false,
  };
}

function filterConfigByPermissions(config, perms) {
  const safeSettings = perms.contentidolSettings
    ? { ...(config.contentidolSettings || {}) }
    : {
        enabled: false,
        intervalMinutes: 5,
        repeatCount: 10,
        speedPxPerSecond: 140,
        fontSize: 48,
        copiesPerRun: 8,
        copyGapSize: 24,
        laneGapPx: 160,
        showMinutes: 0,
        hideMinutes: 0,
        textColor: "#ffffff",
      };

  return {
    enableFirework: perms.enableFirework ? !!config.enableFirework : false,
    contentidol: perms.contentidol ? config.contentidol || [] : [],
    contentidolSettings: safeSettings,
    domains1b: perms.domains1b ? config.domains1b || [] : [],
    domains789: perms.domains789 ? config.domains789 || [] : [],
    domains0b: perms.domains0b ? config.domains0b || [] : [],
  };
}

exports.handler = async (event) => {
  const auth = authRequired(event);
  if (!auth.ok) return auth.response;

  try {
    const { configPath } = repoInfo();
    const file = await getRepoFile(configPath);
    const config = JSON.parse(file.content || "{}");

    const { users } = await readUsersFromRepo();
    const currentUser = users.find((u) => u.username === auth.session.username);
    const perms = getUserPermissions(currentUser || auth.session);

    const safeConfig = filterConfigByPermissions(config, perms);

    return json(200, { config: safeConfig });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load config" });
  }
};
