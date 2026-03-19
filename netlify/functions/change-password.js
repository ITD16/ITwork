const { json, authRequired, readUsers, writeUsers, setSessionCookie, hashPassword, verifyPassword } = require("./_utils");
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  const auth = authRequired(event);
  if (!auth.ok) return auth.response;
  try {
    const { currentPassword, newPassword, confirmPassword } = JSON.parse(event.body || "{}");
    if (!newPassword || !confirmPassword) return json(400, { error: "Missing password fields" });
    if (newPassword !== confirmPassword) return json(400, { error: "Confirm password does not match" });
    if (String(newPassword).length < 6) return json(400, { error: "Password must be at least 6 characters" });
    const users = readUsers();
    const user = users.find(x => x.username === auth.session.username);
    if (!user) return json(404, { error: "User not found" });
    if (!user.mustChangePassword) {
      if (!currentPassword) return json(400, { error: "Current password is required" });
      const ok = await verifyPassword(currentPassword, user.passwordHash);
      if (!ok) return json(401, { error: "Current password is incorrect" });
    }
    const sameAsOld = await verifyPassword(newPassword, user.passwordHash);
    if (sameAsOld) return json(400, { error: "New password must be different" });
    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    delete user.password;
    writeUsers(users);
    return json(200, { ok: true, mustChangePassword: false }, { "Set-Cookie": setSessionCookie(user, { ip: auth.session.ip || "", deviceInfo: auth.session.deviceInfo || "" }) });
  } catch (err) {
    return json(500, { error: err.message || "Change password failed" });
  }
};
