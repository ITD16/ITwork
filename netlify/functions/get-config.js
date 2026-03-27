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
      vmixConfig: true,
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
    vmixConfig: p.vmixConfig !== false,
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

function normalizeVmixConfig(config) {
  return {
    holdLayer2Ms: Number(config?.holdLayer2Ms) || 60000,
    holdLayer3Ms: Number(config?.holdLayer3Ms) || 120000,
    triggerMinutes: Array.isArray(config?.triggerMinutes)
      ? config.triggerMinutes
          .map((x) => Number(x))
          .filter((x) => Number.isInteger(x) && x >= 0 && x <= 59)
      : [],
    enabled: !!config?.enabled,
  };
}

exports.handler = async (event) => {
  const auth = authRequired(event);
  if (!auth.ok) return auth.response;

  try {
    const qs = event.queryStringParameters || {};
    const target =
      String(qs.target || "config").trim() === "vmix-config"
        ? "vmix-config"
        : "config";

    const { configPath, vmixConfigPath } = repoInfo();
    const { users } = await readUsersFromRepo();
    const currentUser = users.find((u) => u.username === auth.session.username);
    const perms = getUserPermissions(currentUser || auth.session);

    if (target === "vmix-config") {
      if (!perms.vmixConfig) {
        return json(403, { error: "Forbidden" });
      }

      const file = await getRepoFile(vmixConfigPath);
      const config = JSON.parse(file.content || "{}");
      return json(200, {
        target: "vmix-config",
        config: normalizeVmixConfig(config),
      });
    }

    const file = await getRepoFile(configPath);
    const config = JSON.parse(file.content || "{}");
    const safeConfig = filterConfigByPermissions(config, perms);

    return json(200, { target: "config", config: safeConfig });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load config" });
  }
};
