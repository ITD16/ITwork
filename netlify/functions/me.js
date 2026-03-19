const { json, authRequired } = require("./_utils");

exports.handler = async (event) => {
  const auth = authRequired(event);
  if (!auth.ok) return auth.response;

  return json(200, {
    username: auth.session.username,
    role: auth.session.role || "user"
  });
};
