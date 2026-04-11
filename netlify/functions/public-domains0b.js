const { json, getRepoFile, repoInfo } = require("./utils");

exports.handler = async () => {
  try {
    const { configPath } = repoInfo();
    const file = await getRepoFile(configPath);
    const config = JSON.parse(file.content || "{}");

    const domains0b = Array.isArray(config.domains0b)
      ? config.domains0b
          .map((x) =>
            String(x || "")
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean)
      : [];

    return json(200, {
      enableFirework: !!config.enableFirework,
      domains0b,
    });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load domains1b" });
  }
};
