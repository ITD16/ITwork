const { json, getRepoFile, repoInfo } = require("./utils");

exports.handler = async () => {
  try {
    const { configPath } = repoInfo();
    const file = await getRepoFile(configPath);
    const config = JSON.parse(file.content || "{}");

    const domains1b = Array.isArray(config.domains1b)
      ? config.domains1b
          .map((x) =>
            String(x || "")
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean)
      : [];

    return json(200, {
      enableFirework: !!config.enableFirework,
      domains1b,
    });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load domains1b" });
  }
};
