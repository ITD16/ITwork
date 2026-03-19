const { json, requireAdmin, readUsers } = require("./_utils");
exports.handler = async (event) => {
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;
  const users = readUsers().map(u => ({ username: u.username, role: u.role || "user", active: u.active !== false, mustChangePassword: !!u.mustChangePassword }));
  return json(200, { users });
};
