const {
  json,
  authRequired,
  getRepoFile,
  putRepoFile,
  repoInfo,
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
      textColor: normalizeColor(s.textColor, "#ffffff"),
    },
    domains1b: normalizeDomains(config.domains1b),
    domains789: normalizeDomains(config.domains789),
    domains0b: normalizeDomains(config.domains0b),
  };
}

function isEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function buildDiff(before, after) {
  const changed = {};
  const keys = Array.from(
    new Set([...Object.keys(before || {}), ...Object.keys(after || {})]),
  );
  for (const key of keys) {
    if (!isEqual(before?.[key], after?.[key])) {
      changed[key] = {
        before: before?.[key],
        after: after?.[key],
      };
    }
  }
  return changed;
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const auth = authRequired(event);
  if (!auth.ok) return auth.response;

  try {
    const body = JSON.parse(event.body || "{}");
    const incomingConfig = body.config || {};

    const { configPath, logPath } = repoInfo();
    const oldConfigFile = await getRepoFile(configPath);
    const before = JSON.parse(oldConfigFile.content || "{}");

    let after;

    after = normalizeConfig(incomingConfig);

    const changes = buildDiff(before, after);

    if (!Object.keys(changes).length) {
      return json(200, {
        ok: true,
        message: "No changes",
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
      action: "update_config",
      changes,
    });

    const newLogs = oldLogs
      ? `${oldLogs.trimEnd()}\n${logLine}\n`
      : `${logLine}\n`;

    await putRepoFile(
      logPath,
      newLogs,
      `append config log by ${auth.session.username}`,
      oldLogSha || undefined,
    );

    return json(200, {
      ok: true,
      commitSha: configResult.commit?.sha || "",
      changes,
      config: after,
    });
  } catch (err) {
    return json(500, { error: err.message || "Cannot save config" });
  }
};
