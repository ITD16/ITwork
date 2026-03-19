const { json, clearSessionCookie } = require("./_utils");
exports.handler = async () => json(200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
