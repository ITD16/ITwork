const { json, authRequired, getRepoFile, repoInfo } = require("./_utils");

exports.handler = async (event) => {
  const auth = authRequired(event);
  if (!auth.ok) return auth.response;

  try {
    const { configPath } = repoInfo();
    const file = await getRepoFile(configPath);
    const config = JSON.parse(file.content || "{}");
    return json(200, { config });
  } catch (err) {
    return json(500, { error: err.message || "Cannot load config" });
  }
};
