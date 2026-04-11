const { json, getRepoFile, repoInfo } = require("./utils");

exports.handler = async () => {
  try {
    const { configPath } = repoInfo();
    const file = await getRepoFile(configPath);
    const config = JSON.parse(file.content || "{}");

    const domains52b = Array.isArray(config.domains52b)
      ? config.domains52b
          .map((x) =>
            String(x || "")
              .trim()
              .toUpperCase(),
          )
          .filter(Boolean)
      : [];

    return json(200, { domains52b });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load domains52b" });
  }
};
