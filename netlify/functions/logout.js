const { json, clearSessionCookie } = require("./utils");
exports.handler = async () => json(200, { ok: true }, { "Set-Cookie": clearSessionCookie() });
