let originalConfig = null;
let currentMe = null;

const IDLE_LIMIT_MS = 5 * 60 * 1000;
let idleTimer = null;

const els = {
  meBox: document.getElementById("meBox"),
  enableFirework: document.getElementById("enableFirework"),
  contentidolList: document.getElementById("contentidolList"),
  contentidolEnabled: document.getElementById("contentidolEnabled"),
  contentidolIntervalMinutes: document.getElementById(
    "contentidolIntervalMinutes",
  ),
  contentidolRepeatCount: document.getElementById("contentidolRepeatCount"),
  contentidolSpeedPxPerSecond: document.getElementById(
    "contentidolSpeedPxPerSecond",
  ),
  contentidolFontSize: document.getElementById("contentidolFontSize"),
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
  logoutBtn: document.getElementById("logoutBtn"),

  userCard: document.getElementById("userCard"),
  usersBox: document.getElementById("usersBox"),
  reloadUsersBtn: document.getElementById("reloadUsersBtn"),

  passwordModal: document.getElementById("passwordModal"),
  passwordForm: document.getElementById("passwordForm"),
  currentPasswordWrap: document.getElementById("currentPasswordWrap"),
  currentPassword: document.getElementById("currentPassword"),
  newPassword: document.getElementById("newPassword"),
  confirmPassword: document.getElementById("confirmPassword"),
  passwordError: document.getElementById("passwordError"),
  passwordOk: document.getElementById("passwordOk"),
  passwordModalText: document.getElementById("passwordModalText"),

  addUserBtn: document.getElementById("addUserBtn"),
  addUserModal: document.getElementById("addUserModal"),
  addUserForm: document.getElementById("addUserForm"),
  addUsername: document.getElementById("addUsername"),
  cancelAddUserBtn: document.getElementById("cancelAddUserBtn"),
  addUserError: document.getElementById("addUserError"),
  addUserOk: document.getElementById("addUserOk"),
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
  (items || []).forEach((item) => container.appendChild(createDomainRow(item)));
}

function getDomainList(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll("input"))
    .map((x) => x.value.trim().toUpperCase())
    .filter(Boolean);
}

function getTextList(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll("input"))
    .map((x) => x.value.trim())
    .filter(Boolean);
}

function collectConfig() {
  return {
    enableFirework: !!els.enableFirework?.checked,
    contentidol: getTextList(els.contentidolList),
    contentidolSettings: {
      enabled: !!els.contentidolEnabled?.checked,
      intervalMinutes: Number(els.contentidolIntervalMinutes?.value || 5),
      repeatCount: Number(els.contentidolRepeatCount?.value || 10),
      speedPxPerSecond: Number(els.contentidolSpeedPxPerSecond?.value || 140),
      fontSize: Number(els.contentidolFontSize?.value || 48),
    },
    domains1b: getDomainList(els.domains1bList),
    domains789: getDomainList(els.domains789List),
    domains0b: getDomainList(els.domains0bList),
  };
}

function renderConfig(config) {
  if (els.enableFirework) els.enableFirework.checked = !!config.enableFirework;

  renderDomainList(els.contentidolList, config.contentidol || []);
  renderDomainList(els.domains1bList, config.domains1b || []);
  renderDomainList(els.domains789List, config.domains789 || []);
  renderDomainList(els.domains0bList, config.domains0b || []);

  const s = config.contentidolSettings || {};

  if (els.contentidolEnabled)
    els.contentidolEnabled.checked = s.enabled !== false;
  if (els.contentidolIntervalMinutes)
    els.contentidolIntervalMinutes.value = s.intervalMinutes ?? 5;
  if (els.contentidolRepeatCount)
    els.contentidolRepeatCount.value = s.repeatCount ?? 10;
  if (els.contentidolSpeedPxPerSecond)
    els.contentidolSpeedPxPerSecond.value = s.speedPxPerSecond ?? 140;
  if (els.contentidolFontSize) els.contentidolFontSize.value = s.fontSize ?? 48;
}

function applyRoleUi() {
  const admin = isAdmin();

  document.querySelectorAll("[data-add]").forEach((btn) => {
    btn.style.display = admin ? "" : "none";
  });

  document.querySelectorAll(".domain-row button.danger").forEach((btn) => {
    btn.style.display = admin ? "" : "none";
  });

  if (els.userCard) {
    els.userCard.style.display = admin ? "" : "none";
  }
}

async function doAutoLogout() {
  try {
    await fetch("/api/logout", { method: "POST", credentials: "include" });
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
  [
    "mousemove",
    "mousedown",
    "click",
    "scroll",
    "keydown",
    "touchstart",
    "input",
    "change",
  ].forEach((eventName) => {
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
    els.meBox.textContent = `User: ${data.username}`;
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

  const admin = isAdmin();

  els.logsBox.innerHTML = logs
    .map((log) => {
      const changesHtml = Object.entries(log.changes || {})
        .map(
          ([key, value]) => `
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
          `,
        )
        .join("");

      const adminMeta = admin
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
    })
    .join("");
}

async function saveConfig() {
  if (els.saveError) els.saveError.textContent = "";
  if (els.saveMessage) els.saveMessage.textContent = "";

  const config = collectConfig();
  const res = await fetch("/api/config/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ config }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    if (els.saveError) els.saveError.textContent = data.error || "Save failed";
    return;
  }

  originalConfig = config;

  if (els.saveMessage) {
    els.saveMessage.textContent =
      data.message || `Saved ok. Commit: ${data.commitSha || ""}`;
  }

  await loadLogs();
  resetIdleTimer();
}

async function loadUsers() {
  if (!isAdmin() || !els.usersBox) return;

  els.usersBox.innerHTML = "Loading...";
  const res = await fetch("/api/users", { credentials: "include" });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    els.usersBox.innerHTML = `<div class="error">${escapeHtml(data.error || "Cannot load users")}</div>`;
    return;
  }

  const users = Array.isArray(data.users) ? data.users : [];

  if (!users.length) {
    els.usersBox.innerHTML = `<div class="muted">No users</div>`;
    return;
  }

  els.usersBox.innerHTML = users
    .map(
      (user) => `
        <div class="user-row">
          <div class="user-meta">
            <strong>${escapeHtml(user.username)}</strong>
            <div class="muted">Role: ${escapeHtml(user.role || "user")}</div>
            <div class="muted">Active: ${user.active ? "Yes" : "No"}</div>
            <div class="muted">Must change password: ${user.mustChangePassword ? "Yes" : "No"}</div>
          </div>
          <div class="row-actions">
            <button type="button" class="secondary" data-reset-user="${escapeHtml(user.username)}">Reset Password</button>
          </div>
        </div>
      `,
    )
    .join("");

  document.querySelectorAll("[data-reset-user]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const username = btn.getAttribute("data-reset-user");
      if (!username || !window.confirm(`Reset password for ${username}?`))
        return;

      try {
        const res = await fetch("/api/users/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ username }),
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          alert(data.error || "Reset password failed");
          return;
        }

        alert(`Temporary password for ${username}: ${data.tempPassword}`);
        await loadUsers();
        resetIdleTimer();
      } catch (err) {
        alert(err.message || "Reset password failed");
      }
    });
  });
}

function openForcePasswordModal() {
  if (!els.passwordModal) return;

  els.passwordError.textContent = "";
  els.passwordOk.textContent = "";
  els.currentPasswordWrap.classList.add("hidden");
  els.passwordModalText.textContent =
    "Bạn cần đổi password trước khi tiếp tục sử dụng.";
  els.passwordModal.classList.remove("hidden");
}

function closePasswordModal() {
  if (!els.passwordModal) return;
  els.passwordModal.classList.add("hidden");
  els.passwordForm.reset();
}

function openAddUserModal() {
  if (!els.addUserModal) return;
  els.addUserError.textContent = "";
  els.addUserOk.textContent = "";
  els.addUserForm.reset();
  els.addUserModal.classList.remove("hidden");
}

function closeAddUserModal() {
  if (!els.addUserModal) return;
  els.addUserModal.classList.add("hidden");
  els.addUserForm.reset();
}

document.querySelectorAll("[data-add]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!isAdmin()) return;

    const key = btn.getAttribute("data-add");
    const map = {
      contentidol: els.contentidolList,
      domains1b: els.domains1bList,
      domains789: els.domains789List,
      domains0b: els.domains0bList,
    };

    map[key]?.appendChild(createDomainRow(""));
    resetIdleTimer();
  });
});

els.saveBtn?.addEventListener("click", saveConfig);

els.resetBtn?.addEventListener("click", () => {
  if (originalConfig) renderConfig(originalConfig);
  applyRoleUi();
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

els.reloadUsersBtn?.addEventListener("click", async () => {
  await loadUsers();
  resetIdleTimer();
});

els.addUserBtn?.addEventListener("click", () => {
  if (!isAdmin()) return;
  openAddUserModal();
  resetIdleTimer();
});

els.cancelAddUserBtn?.addEventListener("click", () => {
  closeAddUserModal();
  resetIdleTimer();
});

els.logoutBtn?.addEventListener("click", async () => {
  await fetch("/api/logout", { method: "POST", credentials: "include" });
  window.location.href = "/";
});

els.passwordForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  els.passwordError.textContent = "";
  els.passwordOk.textContent = "";

  const payload = {
    currentPassword: els.currentPassword?.value || "",
    newPassword: els.newPassword?.value || "",
    confirmPassword: els.confirmPassword?.value || "",
  };

  const res = await fetch("/api/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    els.passwordError.textContent = data.error || "Change password failed";
    return;
  }

  els.passwordOk.textContent = "Password updated successfully";
  currentMe.mustChangePassword = false;

  setTimeout(() => {
    closePasswordModal();
  }, 500);
});

els.addUserForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  els.addUserError.textContent = "";
  els.addUserOk.textContent = "";

  const username = (els.addUsername?.value || "").trim();

  if (!username) {
    els.addUserError.textContent = "Username is required";
    return;
  }

  try {
    const res = await fetch("/api/users/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ username }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      els.addUserError.textContent = data.error || "Add user failed";
      return;
    }

    els.addUserOk.textContent = `Added user ${username}`;
    alert(`Temporary password for ${username}: ${data.tempPassword}`);

    await loadUsers();
    resetIdleTimer();

    setTimeout(() => {
      closeAddUserModal();
    }, 400);
  } catch (err) {
    els.addUserError.textContent = err.message || "Add user failed";
  }
});

(async function init() {
  try {
    await ensureMe();
    await loadConfig();
    await loadLogs();
    await loadUsers();
    bindIdleEvents();

    if (currentMe?.mustChangePassword) {
      openForcePasswordModal();
    }
  } catch (err) {
    console.error(err);
    if (els.saveError) els.saveError.textContent = err.message || "Init failed";
  }
})();
