const { json, getRepoFile, repoInfo } = require("./utils");

exports.handler = async () => {
  try {
    const { configPath } = repoInfo();
    const file = await getRepoFile(configPath);
    const config = JSON.parse(file.content || "{}");

    const domains789 = Array.isArray(config.domains789)
      ? config.domains789
          .map((x) =>
            String(x || "")
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean)
      : [];

    return json(200, {
      enableFirework: !!config.enableFirework,
      domains789,
    });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load domains789" });
  }
};
