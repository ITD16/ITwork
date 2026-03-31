const {
  json,
  authRequired,
  getRepoFile,
  putRepoFile,
  repoInfo,
  readUsersFromRepo,
  requireSameOrigin,
} = require("./utils");

function normalizeDomains(arr) {
  return Array.from(
    new Set(
      (Array.isArray(arr) ? arr : [])
        .map((x) =>
          String(x || "")
            .trim()
            .toUpperCase(),
        )
        .filter(Boolean),
    ),
  );
}

function normalizeWebscams(arr) {
  return Array.from(
    new Set(
      (Array.isArray(arr) ? arr : [])
        .map((x) => String(x || "").trim())
        .filter(Boolean),
    ),
  );
}

function normalizeNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeColor(value, fallback = "#ffffff") {
  const v = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
}

function normalizeTime(value, fallback = "00:00") {
  const v = String(value || "").trim();
  return /^\d{2}:\d{2}$/.test(v) ? v : fallback;
}

function normalizeContentIdol(arr) {
  return (Array.isArray(arr) ? arr : [])
    .map((item) => ({
      text: String(item?.text || "").trim(),
      startTime: normalizeTime(item?.startTime, "00:00"),
      endTime: normalizeTime(item?.endTime, "23:59"),
      enabled: item?.enabled !== false,
    }))
    .filter((item) => item.text);
}

function normalizeConfig(config) {
  const s = config.contentidolSettings || {};

  return {
    enableFirework: !!config.enableFirework,
    contentidol: normalizeContentIdol(config.contentidol),
    contentidolSettings: {
      enabled: s.enabled !== false,
      intervalMinutes: normalizeNumber(s.intervalMinutes, 5),
      repeatCount: normalizeNumber(s.repeatCount, 10),
      speedPxPerSecond: normalizeNumber(s.speedPxPerSecond, 140),
      fontSize: normalizeNumber(s.fontSize, 48),
      copiesPerRun: normalizeNumber(s.copiesPerRun, 8),
      copyGapSize: normalizeNumber(s.copyGapSize, 24),
      laneGapPx: normalizeNumber(s.laneGapPx, 160),
      showMinutes: normalizeNumber(s.showMinutes, 0),
      hideMinutes: normalizeNumber(s.hideMinutes, 0),
      textColor: normalizeColor(s.textColor, "#ffffff"),
    },
    domains1b: normalizeDomains(config.domains1b),
    domains789: normalizeDomains(config.domains789),
    domains0b: normalizeDomains(config.domains0b),
    webscam1b: normalizeWebscams(config.webscam1b),
    webscam0b: normalizeWebscams(config.webscam0b),
  };
}

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj || {}, key);
}

function normalizePartialConfig(config) {
  const out = {};

  if (hasOwn(config, "enableFirework")) {
    out.enableFirework = !!config.enableFirework;
  }

  if (hasOwn(config, "contentidol")) {
    out.contentidol = normalizeContentIdol(config.contentidol);
  }

  if (hasOwn(config, "contentidolSettings")) {
    const s = config.contentidolSettings || {};
    out.contentidolSettings = {
      enabled: s.enabled !== false,
      intervalMinutes: normalizeNumber(s.intervalMinutes, 5),
      repeatCount: normalizeNumber(s.repeatCount, 10),
      speedPxPerSecond: normalizeNumber(s.speedPxPerSecond, 140),
      fontSize: normalizeNumber(s.fontSize, 48),
      copiesPerRun: normalizeNumber(s.copiesPerRun, 8),
      copyGapSize: normalizeNumber(s.copyGapSize, 24),
      laneGapPx: normalizeNumber(s.laneGapPx, 160),
      showMinutes: normalizeNumber(s.showMinutes, 0),
      hideMinutes: normalizeNumber(s.hideMinutes, 0),
      textColor: normalizeColor(s.textColor, "#ffffff"),
    };
  }

  if (hasOwn(config, "domains1b")) {
    out.domains1b = normalizeDomains(config.domains1b);
  }

  if (hasOwn(config, "domains789")) {
    out.domains789 = normalizeDomains(config.domains789);
  }

  if (hasOwn(config, "domains0b")) {
    out.domains0b = normalizeDomains(config.domains0b);
  }

  if (hasOwn(config, "webscam1b")) {
    out.webscam1b = normalizeDomains(config.webscam1b);
  }

  if (hasOwn(config, "webscam0b")) {
    out.webscam0b = normalizeDomains(config.webscam0b);
  }

  return out;
}

function mergeConfigPatch(before, patch) {
  return {
    ...before,
    ...patch,
    contentidolSettings: patch.contentidolSettings
      ? { ...(before.contentidolSettings || {}), ...patch.contentidolSettings }
      : before.contentidolSettings,
  };
}

function normalizeVmixConfig(config) {
  const triggerMinutesRaw = Array.isArray(config?.triggerMinutes)
    ? config.triggerMinutes
    : String(config?.triggerMinutes || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

  return {
    holdLayer2Ms: normalizeNumber(config?.holdLayer2Ms, 60000),
    holdLayer3Ms: normalizeNumber(config?.holdLayer3Ms, 120000),
    triggerMinutes: Array.from(
      new Set(
        triggerMinutesRaw
          .map((x) => Number(x))
          .filter((x) => Number.isInteger(x) && x >= 0 && x <= 59),
      ),
    ).sort((a, b) => a - b),
    enabled: !!config?.enabled,
  };
}

function normalizeVmixConfig2(config) {
  const triggerTimesRaw = Array.isArray(config?.triggerTimes)
    ? config.triggerTimes
    : String(config?.triggerTimes || "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);

  return {
    triggerTimes: Array.from(
      new Set(triggerTimesRaw.filter((x) => /^\d{2}:\d{2}$/.test(String(x)))),
    ).sort(),
  };
}

function isEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function buildDiff(before, after) {
  const changed = {};
  const keys = Array.from(
    new Set([...Object.keys(before || {}), ...Object.keys(after || {})]),
  );

  for (const key of keys) {
    const beforeVal = before?.[key];
    const afterVal = after?.[key];

    if (isEqual(beforeVal, afterVal)) continue;

    if (isPlainObject(beforeVal) && isPlainObject(afterVal)) {
      const nested = {};
      const nestedKeys = Array.from(
        new Set([
          ...Object.keys(beforeVal || {}),
          ...Object.keys(afterVal || {}),
        ]),
      );

      for (const nestedKey of nestedKeys) {
        const nestedBefore = beforeVal?.[nestedKey];
        const nestedAfter = afterVal?.[nestedKey];

        if (!isEqual(nestedBefore, nestedAfter)) {
          nested[nestedKey] = {
            before: nestedBefore,
            after: nestedAfter,
          };
        }
      }

      if (Object.keys(nested).length) {
        changed[key] = nested;
      }

      continue;
    }

    changed[key] = {
      before: beforeVal,
      after: afterVal,
    };
  }

  return changed;
}

function getUserPermissions(user) {
  if (!user || (user.role || "user") === "admin") {
    return {
      isAdmin: true,
      contentidol: true,
      contentidolSettings: true,
      domains1b: true,
      domains789: true,
      domains0b: true,
      webscam1b: true,
      webscam0b: true,
      enableFirework: true,
      vmixConfig: true,
      vmixConfig2: true,
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
    vmixConfig2: p.vmixConfig2 !== false,
  };
}

function getUnauthorizedChangedFields(changes, perms) {
  const unauthorized = [];

  if (changes.enableFirework && !perms.enableFirework) {
    unauthorized.push("enableFirework");
  }
  if (changes.contentidol && !perms.contentidol) {
    unauthorized.push("contentidol");
  }
  if (changes.contentidolSettings && !perms.contentidolSettings) {
    unauthorized.push("contentidolSettings");
  }
  if (changes.domains1b && !perms.domains1b) {
    unauthorized.push("domains1b");
  }
  if (changes.domains789 && !perms.domains789) {
    unauthorized.push("domains789");
  }
  if (changes.domains0b && !perms.domains0b) {
    unauthorized.push("domains0b");
  }
  if (changes.webscam1b && !perms.webscam1b) {
    unauthorized.push("webscam1b");
  }
  if (changes.webscam0b && !perms.webscam0b) {
    unauthorized.push("webscam0b");
  }
  return unauthorized;
}

function applyPermissionFilteredConfig(before, incoming, perms) {
  return {
    enableFirework: perms.enableFirework
      ? incoming.enableFirework
      : before.enableFirework,

    contentidol: perms.contentidol ? incoming.contentidol : before.contentidol,

    contentidolSettings: perms.contentidolSettings
      ? incoming.contentidolSettings
      : before.contentidolSettings,

    domains1b: perms.domains1b ? incoming.domains1b : before.domains1b,
    domains789: perms.domains789 ? incoming.domains789 : before.domains789,
    domains0b: perms.domains0b ? incoming.domains0b : before.domains0b,
    webscam1b: perms.webscam1b ? incoming.webscam1b : before.webscam1b,
    webscam0b: perms.webscam0b ? incoming.webscam0b : before.webscam0b,
  };
}

async function appendLog(logPath, auth, action, target, changes) {
  let oldLogSha = null;
  let oldLogs = "";

  try {
    const logFile = await getRepoFile(logPath);
    oldLogSha = logFile.sha;
    oldLogs = logFile.content || "";
  } catch (err) {
    oldLogs = "";
  }

  const logLine = JSON.stringify({
    time: new Date().toISOString(),
    user: auth.session.username,
    role: auth.session.role || "user",
    ip: auth.session.ip || "",
    deviceInfo: auth.session.deviceInfo || "",
    action,
    target,
    changes,
  });

  const newLogs = oldLogs
    ? `${oldLogs.trimEnd()}
${logLine}
`
    : `${logLine}
`;

  await putRepoFile(
    logPath,
    newLogs,
    `append ${target} log by ${auth.session.username}`,
    oldLogSha || undefined,
  );
}

function parseTarget(value) {
  const target = String(value || "config").trim();

  if (target === "vmix-config2") return "vmix-config2";
  if (target === "vmix-config") return "vmix-config";
  return "config";
}

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
    const incomingConfig = body.config || {};
    const target = parseTarget(body.target);

    const { configPath, vmixConfigPath, vmixConfig2Path, logPath } = repoInfo();
    const { users } = await readUsersFromRepo();
    const currentUser = users.find((u) => u.username === auth.session.username);
    const perms = getUserPermissions(currentUser || auth.session);

    if (target === "vmix-config") {
      if (!perms.vmixConfig) {
        return json(403, {
          error: "You do not have permission to modify: vmix-config",
        });
      }

      const oldConfigFile = await getRepoFile(vmixConfigPath);
      const before = JSON.parse(oldConfigFile.content || "{}");
      const normalizedIncoming = normalizeVmixConfig(incomingConfig);
      const changes = buildDiff(before, normalizedIncoming);

      if (!Object.keys(changes).length) {
        return json(200, {
          ok: true,
          message: "No changes",
          target: "vmix-config",
          changes: {},
          config: normalizedIncoming,
        });
      }

      const configContent = JSON.stringify(normalizedIncoming, null, 2) + "\n";
      const configResult = await putRepoFile(
        vmixConfigPath,
        configContent,
        `update vmix-config by ${auth.session.username}`,
        oldConfigFile.sha,
      );

      await appendLog(
        logPath,
        auth,
        "update_vmix_config",
        "vmix-config",
        changes,
      );

      return json(200, {
        ok: true,
        commitSha: configResult.commit?.sha || "",
        target: "vmix-config",
        changes,
        config: normalizedIncoming,
      });
    }

    if (target === "vmix-config2") {
      if (!perms.vmixConfig2) {
        return json(403, {
          error: "You do not have permission to modify: vmix-config2",
        });
      }

      const oldConfigFile = await getRepoFile(vmixConfig2Path);
      const before = JSON.parse(oldConfigFile.content || "{}");
      const normalizedIncoming = normalizeVmixConfig2(incomingConfig);
      const changes = buildDiff(before, normalizedIncoming);

      if (!Object.keys(changes).length) {
        return json(200, {
          ok: true,
          message: "No changes",
          target: "vmix-config2",
          changes: {},
          config: normalizedIncoming,
        });
      }

      const configContent = JSON.stringify(normalizedIncoming, null, 2) + "\n";
      const configResult = await putRepoFile(
        vmixConfig2Path,
        configContent,
        `update vmix-config2 by ${auth.session.username}`,
        oldConfigFile.sha,
      );

      await appendLog(
        logPath,
        auth,
        "update_vmix_config2",
        "vmix-config2",
        changes,
      );

      return json(200, {
        ok: true,
        commitSha: configResult.commit?.sha || "",
        target: "vmix-config2",
        changes,
        config: normalizedIncoming,
      });
    }

    const oldConfigFile = await getRepoFile(configPath);
    const before = JSON.parse(oldConfigFile.content || "{}");

    const normalizedPatch = normalizePartialConfig(incomingConfig);
    const requestedChanges = buildDiff(
      before,
      mergeConfigPatch(before, normalizedPatch),
    );

    const unauthorizedFields = getUnauthorizedChangedFields(
      requestedChanges,
      perms,
    );

    if (unauthorizedFields.length) {
      return json(403, {
        error: `You do not have permission to modify: ${unauthorizedFields.join(", ")}`,
      });
    }

    const after = applyPermissionFilteredConfig(
      before,
      mergeConfigPatch(before, normalizedPatch),
      perms,
    );

    const changes = buildDiff(before, after);

    if (!Object.keys(changes).length) {
      return json(200, {
        ok: true,
        message: "No changes",
        target: "config",
        changes: {},
        config: after,
      });
    }

    const configContent = JSON.stringify(after, null, 2) + "\n";
    const configResult = await putRepoFile(
      configPath,
      configContent,
      `update config by ${auth.session.username}`,
      oldConfigFile.sha,
    );

    await appendLog(logPath, auth, "update_config", "config", changes);

    return json(200, {
      ok: true,
      commitSha: configResult.commit?.sha || "",
      target: "config",
      changes,
      config: after,
    });
  } catch (err) {
    return json(500, { error: err.message || "Cannot save config" });
  }
};
