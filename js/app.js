let originalConfig = null;
let currentMe = null;

const IDLE_LIMIT_MS = 5 * 60 * 1000;
let idleTimer = null;

const els = {
  meBox: document.getElementById("meBox"),
  enableFirework: document.getElementById("enableFirework"),
  domains1bList: document.getElementById("domains1bList"),
  domains789List: document.getElementById("domains789List"),
  domains0bList: document.getElementById("domains0bList"),
  saveMessage: document.getElementById("saveMessage"),
  saveError: document.getElementById("saveError"),
  logsBox: document.getElementById("logsBox"),
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),
  reloadBtn: document.getElementById("reloadBtn"),
  reloadLogsBtn: document.getElementById("reloadLogsBtn"),
  logoutBtn: document.getElementById("logoutBtn")
};

function isAdmin() {
  return (currentMe?.role || "user") === "admin";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function createDomainRow(value = "") {
  const row = document.createElement("div");
  row.className = "domain-row";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = "Example: SUNWIN.AG";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "danger";
  btn.textContent = "X";
  btn.style.display = isAdmin() ? "" : "none";

  btn.addEventListener("click", () => {
    if (!isAdmin()) return;
    row.remove();
    resetIdleTimer();
  });

  row.appendChild(input);
  row.appendChild(btn);
  return row;
}

function renderDomainList(container, items) {
  if (!container) return;
  container.innerHTML = "";
  (items || []).forEach(item => container.appendChild(createDomainRow(item)));
}

function getDomainList(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll("input"))
    .map(x => x.value.trim().toUpperCase())
    .filter(Boolean);
}

function collectConfig() {
  return {
    enableFirework: !!els.enableFirework?.checked,
    domains1b: getDomainList(els.domains1bList),
    domains789: getDomainList(els.domains789List),
    domains0b: getDomainList(els.domains0bList)
  };
}

function renderConfig(config) {
  if (els.enableFirework) els.enableFirework.checked = !!config.enableFirework;
  renderDomainList(els.domains1bList, config.domains1b || []);
  renderDomainList(els.domains789List, config.domains789 || []);
  renderDomainList(els.domains0bList, config.domains0b || []);
}

function applyRoleUi() {
  const admin = isAdmin();

  document.querySelectorAll("[data-add]").forEach(btn => {
    btn.style.display = admin ? "" : "none";
  });

  document.querySelectorAll(".domain-row button.danger").forEach(btn => {
    btn.style.display = admin ? "" : "none";
  });
}

async function doAutoLogout() {
  try {
    await fetch("/api/logout", {
      method: "POST",
      credentials: "include"
    });
  } catch (err) {
    console.error("Auto logout failed:", err);
  }
  window.location.href = "/";
}

function resetIdleTimer() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(doAutoLogout, IDLE_LIMIT_MS);
}

function bindIdleEvents() {
  const events = [
    "mousemove",
    "mousedown",
    "click",
    "scroll",
    "keydown",
    "touchstart",
    "input",
    "change"
  ];

  events.forEach(eventName => {
    window.addEventListener(eventName, resetIdleTimer, { passive: true });
  });

  resetIdleTimer();
}

async function ensureMe() {
  const res = await fetch("/api/me", { credentials: "include" });
  if (!res.ok) {
    window.location.href = "/";
    return;
  }
  const data = await res.json();
  currentMe = data;
  if (els.meBox) {
    els.meBox.textContent = `User: ${data.username} (${data.role || "user"})`;
  }
  applyRoleUi();
}

async function loadConfig() {
  if (els.saveError) els.saveError.textContent = "";
  if (els.saveMessage) els.saveMessage.textContent = "";

  const res = await fetch("/api/config", { credentials: "include" });

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = "/";
      return;
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Cannot load config");
  }

  const data = await res.json();
  originalConfig = data.config || {};
  renderConfig(originalConfig);
  applyRoleUi();
}

async function loadLogs() {
  if (!els.logsBox) return;

  els.logsBox.innerHTML = "Loading...";
  const res = await fetch("/api/logs", { credentials: "include" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    els.logsBox.innerHTML = `<div class="error">${escapeHtml(data.error || "Cannot load logs")}</div>`;
    return;
  }

  const data = await res.json();
  const logs = Array.isArray(data.logs) ? data.logs : [];

  if (!logs.length) {
    els.logsBox.innerHTML = `<div class="muted">Chưa có log</div>`;
    return;
  }

  const isAdmin = (currentMe?.role || "user") === "admin";

  els.logsBox.innerHTML = logs.map(log => {
    const changesHtml = Object.entries(log.changes || {})
      .map(([key, value]) => `
        <div class="log-change">
          <div><strong>${escapeHtml(key)}</strong></div>
          <div class="log-grid">
            <div>
              <div class="muted">Before</div>
              <pre>${escapeHtml(JSON.stringify(value.before, null, 2))}</pre>
            </div>
            <div>
              <div class="muted">After</div>
              <pre>${escapeHtml(JSON.stringify(value.after, null, 2))}</pre>
            </div>
          </div>
        </div>
      `)
      .join("");

    const adminMeta = isAdmin
      ? `
        <div class="muted">IP: ${escapeHtml(log.ip || "-")}</div>
        <div class="muted">Device: ${escapeHtml(log.deviceInfo || "-")}</div>
      `
      : "";

    return `
      <div class="log-item">
        <div class="log-meta">
          <strong>${escapeHtml(log.user || "unknown")}</strong>
          (${escapeHtml(log.role || "user")})
          - ${escapeHtml(log.time || "")}
        </div>
        ${adminMeta}
        ${changesHtml || `<div class="muted">No detail</div>`}
      </div>
    `;
  }).join("");
}

async function saveConfig() {
  if (els.saveError) els.saveError.textContent = "";
  if (els.saveMessage) els.saveMessage.textContent = "";

  const config = collectConfig();
  const res = await fetch("/api/config/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ config })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (els.saveError) els.saveError.textContent = data.error || "Save failed";
    return;
  }

  originalConfig = config;
  if (els.saveMessage) {
    els.saveMessage.textContent = data.message || `Saved ok. Commit: ${data.commitSha || ""}`;
  }

  await loadLogs();
  resetIdleTimer();
}

document.querySelectorAll("[data-add]").forEach(btn => {
  btn.addEventListener("click", () => {
    if (!isAdmin()) return;

    const key = btn.getAttribute("data-add");
    const map = {
      domains1b: els.domains1bList,
      domains789: els.domains789List,
      domains0b: els.domains0bList
    };
    map[key]?.appendChild(createDomainRow(""));
    resetIdleTimer();
  });
});

els.saveBtn?.addEventListener("click", saveConfig);
els.resetBtn?.addEventListener("click", () => {
  if (originalConfig) renderConfig(originalConfig);
  resetIdleTimer();
});
els.reloadBtn?.addEventListener("click", async () => {
  await loadConfig();
  resetIdleTimer();
});
els.reloadLogsBtn?.addEventListener("click", async () => {
  await loadLogs();
  resetIdleTimer();
});
els.logoutBtn?.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
  window.location.href = "/";
});

(async function init() {
  try {
    await ensureMe();
    await loadConfig();
    await loadLogs();
    bindIdleEvents();
  } catch (err) {
    console.error(err);
    if (els.saveError) els.saveError.textContent = err.message || "Init failed";
  }
})();
