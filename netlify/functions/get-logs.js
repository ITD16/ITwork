const { json, authRequired, getRepoFile, repoInfo } = require("./_utils");

exports.handler = async (event) => {
  const auth = authRequired(event);
  if (!auth.ok) return auth.response;

  try {
    const { logPath } = repoInfo();
    let text = "";

    try {
      const file = await getRepoFile(logPath);
      text = file.content || "";
    } catch (err) {
      text = "";
    }

    let logs = text
      .split(/\r?\n/)
      .map(x => x.trim())
      .filter(Boolean)
      .map(line => {
        try {
          return JSON.parse(line);
        } catch {
          return null;
        }
      })
      .filter(Boolean);

    if ((auth.session.role || "user") !== "admin") {
      logs = logs.filter(x => x.user === auth.session.username);
    }

    logs.reverse();

    return json(200, { logs });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load logs" });
  }
};
