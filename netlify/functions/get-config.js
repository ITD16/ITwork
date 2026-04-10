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
      vmixConfig0: true,
      vmixConfig2: true,
      webscam1b: true,
      webscam0b: true,
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
    webscam1b: p.webscam1b !== false,
    webscam0b: p.webscam0b !== false,
    enableFirework: false,
    vmixConfig: p.vmixConfig !== false,
    vmixConfig0: p.vmixConfig0 !== false,
    vmixConfig2: p.vmixConfig2 !== false,
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
    webscam1b: perms.webscam1b ? config.webscam1b || [] : [],
    webscam0b: perms.webscam0b ? config.webscam0b || [] : [],
  };
}

function normalizeVmixConfig(config) {
  return {
    enabled: !!config?.enabled,
    baseLayer: String(config?.baseLayer || "LAYER 1").trim() || "LAYER 1",
    triggerMinutes: Array.isArray(config?.triggerMinutes)
      ? config.triggerMinutes
          .map((x) => Number(x))
          .filter((x) => Number.isInteger(x) && x >= 0 && x <= 59)
      : [],
    layersCsv: String(config?.layersCsv || "").trim(),
  };
}

function normalizeVmixConfig2(config) {
  return {
    triggerTimes: Array.isArray(config?.triggerTimes)
      ? config.triggerTimes
          .map((x) => String(x || "").trim())
          .filter((x) => /^\d{2}:\d{2}$/.test(x))
      : [],
  };
}

function parseTarget(value) {
  const target = String(value || "config").trim();

  if (target === "vmix-config2") return "vmix-config2";
  if (target === "vmix-config0") return "vmix-config0";
  if (target === "vmix-config") return "vmix-config";
  return "config";
}

exports.handler = async (event) => {
  const auth = authRequired(event);
  if (!auth.ok) return auth.response;

  try {
    const qs = event.queryStringParameters || {};
    const target = parseTarget(qs.target);

    const { configPath, vmixConfigPath, vmixConfig0Path, vmixConfig2Path } =
      repoInfo();
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

    if (target === "vmix-config0") {
      if (!perms.vmixConfig0) {
        return json(403, { error: "Forbidden" });
      }

      const file = await getRepoFile(vmixConfig0Path);
      const config = JSON.parse(file.content || "{}");
      return json(200, {
        target: "vmix-config0",
        config: normalizeVmixConfig(config),
      });
    }

    if (target === "vmix-config2") {
      if (!perms.vmixConfig2) {
        return json(403, { error: "Forbidden" });
      }

      const file = await getRepoFile(vmixConfig2Path);
      const config = JSON.parse(file.content || "{}");
      return json(200, {
        target: "vmix-config2",
        config: normalizeVmixConfig2(config),
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
