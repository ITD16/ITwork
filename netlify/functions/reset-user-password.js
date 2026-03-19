const { json, requireAdmin, readUsers, writeUsers, makeRandomPassword, hashPassword } = require("./_utils");
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const auth = requireAdmin(event);
  if (!auth.ok) return auth.response;
  try {
    const { username } = JSON.parse(event.body || "{}");
    if (!username) return json(400, { error: "Missing username" });
    const users = readUsers();
    const user = users.find(x => x.username === username);
    if (!user) return json(404, { error: "User not found" });
    const tempPassword = makeRandomPassword(10);
    user.passwordHash = await hashPassword(tempPassword);
    user.mustChangePassword = true;
    delete user.password;
    writeUsers(users);
    return json(200, { ok: true, username, tempPassword, mustChangePassword: true });
  } catch (err) {
    return json(500, { error: err.message || "Reset password failed" });
  }
};
