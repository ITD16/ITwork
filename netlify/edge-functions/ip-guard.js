export default async (request, context) => {
  const clientIp = String(context.ip || "").trim();
  const url = new URL(request.url);
  const path = url.pathname || "/";

  const whitelist = String(Netlify.env.get("IP_WHITELIST") || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  const localAllowed = ["127.0.0.1", "::1"];
  const allowed = localAllowed.includes(clientIp) || whitelist.includes(clientIp);

  if (allowed) {
    return context.next();
  }

  const payload = {
    ip: clientIp || "unknown",
    path,
    referer: request.headers.get("referer") || "",
    userAgent: request.headers.get("user-agent") || "",
    country: request.headers.get("x-country") || "",
    time: new Date().toISOString(),
  };

  console.log(JSON.stringify({ type: "ip_guard_denied", ...payload }));

  try {
    const origin = `${url.protocol}//${url.host}`;
    await fetch(`${origin}/api/log-block-ip`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-block-ip-secret": String(Netlify.env.get("BLOCK_IP_LOG_SECRET") || ""),
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.log(
      JSON.stringify({
        type: "ip_guard_log_error",
        message: String(err?.message || err || "log failed"),
        ip: payload.ip,
        path: payload.path,
        time: payload.time,
      }),
    );
  }

  const blockedPageRes = await fetch(new URL("/404.html", request.url));
  const blockedHtml = await blockedPageRes.text();

  return new Response(blockedHtml, {
    status: 404,
    headers: {
      "content-type": "text/html; charset=UTF-8",
      "cache-control": "no-store",
    },
  });
};

export const config = {
  path: ["/", "/index.html"],
};
