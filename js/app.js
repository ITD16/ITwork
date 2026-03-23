let originalConfig = null;
let currentMe = null;

const IDLE_LIMIT_MS = 5 * 60 * 1000;
let idleTimer = null;

const els = {
  meBox: document.getElementById("meBox"),
  enableFirework: document.getElementById("enableFirework"),

  contentidolSection: document.getElementById("contentidolSection"),
  contentidolSettingsSection: document.getElementById(
    "contentidolSettingsSection",
  ),
  domains1bSection: document.getElementById("domains1bSection"),
  domains789Section: document.getElementById("domains789Section"),
  domains0bSection: document.getElementById("domains0bSection"),

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
  contentidolCopiesPerRun: document.getElementById("contentidolCopiesPerRun"),
  contentidolCopyGapSize: document.getElementById("contentidolCopyGapSize"),
  contentidolLaneGapPx: document.getElementById("contentidolLaneGapPx"),
  contentidolShowMinutes: document.getElementById("contentidolShowMinutes"),
  contentidolHideMinutes: document.getElementById("contentidolHideMinutes"),
  contentidolTextColor: document.getElementById("contentidolTextColor"),
  contentidolTextColorCode: document.getElementById("contentidolTextColorCode"),

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

function roleName() {
  return currentMe?.role || "user";
}

function isAdmin() {
  return roleName() === "admin";
}

function canEditAll() {
  const role = roleName();
  return role === "admin" || role === "user";
}

function canEditContentIdol() {
  return canEditAll();
}

function getPermissions() {
  const perms = currentMe?.permissions || {};
  return {
    contentidol: perms.contentidol !== false,
    contentidolSettings: perms.contentidolSettings !== false,
    domains1b: perms.domains1b !== false,
    domains789: perms.domains789 !== false,
    domains0b: perms.domains0b !== false,
  };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function normalizeHexColor(value, fallback = "#ffffff") {
  const v = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : fallback;
}

function normalizeTimeValue(value, fallback = "00:00") {
  const v = String(value || "").trim();
  return /^\d{2}:\d{2}$/.test(v) ? v : fallback;
}

function normalizeNumberInput(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatDateTimeVN(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour12: false,
  });
}

function isDirectBeforeAfterObject(value) {
  return (
    value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === 2 &&
    Object.prototype.hasOwnProperty.call(value, "before") &&
    Object.prototype.hasOwnProperty.call(value, "after")
  );
}

function formatLogValue(value) {
  if (value === undefined) return "-";
  return escapeHtml(JSON.stringify(value, null, 2));
}

function renderLogChange(label, value) {
  if (isDirectBeforeAfterObject(value)) {
    return `
      <div class="log-change">
        <div><strong>${escapeHtml(label)}</strong></div>
        <div class="log-grid">
          <div>
            <div class="muted">Before</div>
            <pre>${formatLogValue(value.before)}</pre>
          </div>
          <div>
            <div class="muted">After</div>
            <pre>${formatLogValue(value.after)}</pre>
          </div>
        </div>
      </div>
    `;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const nestedHtml = Object.entries(value)
      .map(([subKey, subVal]) => renderLogChange(subKey, subVal))
      .join("");

    return `
      <div class="log-change">
        <div><strong>${escapeHtml(label)}</strong></div>
        ${nestedHtml || `<div class="muted">No detail</div>`}
      </div>
    `;
  }

  return `
    <div class="log-change">
      <div><strong>${escapeHtml(label)}</strong></div>
      <div class="log-grid">
        <div>
          <div class="muted">Before</div>
          <pre>-</pre>
        </div>
        <div>
          <div class="muted">After</div>
          <pre>${formatLogValue(value)}</pre>
        </div>
      </div>
    </div>
  `;
}

function createDomainRow(value = "") {
  const row = document.createElement("div");
  row.className = "domain-row";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = "Example: SUNWIN.AG";
  input.disabled = false;

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

function createContentIdolRow(item = {}) {
  const row = document.createElement("div");
  row.className = "contentidol-item";

  const wrap = document.createElement("div");
  wrap.className = "contentidol-inline";

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.placeholder = "Ví dụ: ĐANG LIVE TẠI Phòng 1";
  textInput.value = item.text || "";
  textInput.disabled = false;

  const timeActions = document.createElement("div");
  timeActions.className = "contentidol-time-actions";

  const startWrap = document.createElement("label");
  startWrap.className = "time-inline-field";
  const startLabel = document.createElement("span");
  startLabel.textContent = "Start";
  const startInput = document.createElement("input");
  startInput.type = "time";
  startInput.value = normalizeTimeValue(item.startTime, "12:00");
  startInput.disabled = false;
  startWrap.appendChild(startLabel);
  startWrap.appendChild(startInput);

  const endWrap = document.createElement("label");
  endWrap.className = "time-inline-field";
  const endLabel = document.createElement("span");
  endLabel.textContent = "End";
  const endInput = document.createElement("input");
  endInput.type = "time";
  endInput.value = normalizeTimeValue(item.endTime, "15:00");
  endInput.disabled = false;
  endWrap.appendChild(endLabel);
  endWrap.appendChild(endInput);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "danger";
  removeBtn.textContent = "X";
  removeBtn.style.display = canEditContentIdol() ? "" : "none";

  removeBtn.addEventListener("click", () => {
    if (!canEditContentIdol()) return;
    row.remove();
    resetIdleTimer();
  });

  timeActions.appendChild(startWrap);
  timeActions.appendChild(endWrap);
  timeActions.appendChild(removeBtn);

  wrap.appendChild(textInput);
  wrap.appendChild(timeActions);
  row.appendChild(wrap);

  return row;
}

function renderContentIdolList(container, items) {
  if (!container) return;
  container.innerHTML = "";
  (items || []).forEach((item) => {
    container.appendChild(createContentIdolRow(item));
  });
}

function getContentIdolList(container) {
  if (!container) return [];

  return Array.from(container.querySelectorAll(".contentidol-item"))
    .map((row) => {
      const inputs = row.querySelectorAll("input");
      const text = inputs[0]?.value?.trim() || "";
      const startTime = normalizeTimeValue(inputs[1]?.value || "", "00:00");
      const endTime = normalizeTimeValue(inputs[2]?.value || "", "23:59");

      return {
        text,
        startTime,
        endTime,
        enabled: true,
      };
    })
    .filter((item) => item.text);
}

function collectConfig() {
  return {
    enableFirework: !!els.enableFirework?.checked,
    contentidol: getContentIdolList(els.contentidolList),
    contentidolSettings: {
      enabled: !!els.contentidolEnabled?.checked,
      intervalMinutes: Number(els.contentidolIntervalMinutes?.value || 5),
      repeatCount: Number(els.contentidolRepeatCount?.value || 10),
      speedPxPerSecond: Number(els.contentidolSpeedPxPerSecond?.value || 140),
      fontSize: Number(els.contentidolFontSize?.value || 48),
      copiesPerRun: Number(els.contentidolCopiesPerRun?.value || 8),
      copyGapSize: Number(els.contentidolCopyGapSize?.value || 24),
      laneGapPx: Number(els.contentidolLaneGapPx?.value || 160),
      showMinutes: normalizeNumberInput(
        els.contentidolShowMinutes?.value || 0,
        0,
      ),
      hideMinutes: normalizeNumberInput(
        els.contentidolHideMinutes?.value || 0,
        0,
      ),
      textColor: normalizeHexColor(
        els.contentidolTextColorCode?.value || els.contentidolTextColor?.value,
        "#ffffff",
      ),
    },
    domains1b: getDomainList(els.domains1bList),
    domains789: getDomainList(els.domains789List),
    domains0b: getDomainList(els.domains0bList),
  };
}

function renderConfig(config) {
  if (els.enableFirework) els.enableFirework.checked = !!config.enableFirework;

  renderContentIdolList(els.contentidolList, config.contentidol || []);
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
  if (els.contentidolCopiesPerRun)
    els.contentidolCopiesPerRun.value = s.copiesPerRun ?? 8;
  if (els.contentidolCopyGapSize)
    els.contentidolCopyGapSize.value = s.copyGapSize ?? 24;
  if (els.contentidolLaneGapPx)
    els.contentidolLaneGapPx.value = s.laneGapPx ?? 160;
  if (els.contentidolShowMinutes)
    els.contentidolShowMinutes.value = s.showMinutes ?? 0;
  if (els.contentidolHideMinutes)
    els.contentidolHideMinutes.value = s.hideMinutes ?? 0;

  const color = normalizeHexColor(s.textColor || "#ffffff", "#ffffff");
  if (els.contentidolTextColor) els.contentidolTextColor.value = color;
  if (els.contentidolTextColorCode) els.contentidolTextColorCode.value = color;
}

function applyRoleUi() {
  const admin = isAdmin();
  const canEdit = canEditAll();
  const perms = getPermissions();

  if (els.contentidolSection) {
    els.contentidolSection.style.display =
      admin || perms.contentidol ? "" : "none";
  }
  if (els.contentidolSettingsSection) {
    els.contentidolSettingsSection.style.display =
      admin || perms.contentidolSettings ? "" : "none";
  }
  if (els.domains1bSection) {
    els.domains1bSection.style.display = admin || perms.domains1b ? "" : "none";
  }
  if (els.domains789Section) {
    els.domains789Section.style.display =
      admin || perms.domains789 ? "" : "none";
  }
  if (els.domains0bSection) {
    els.domains0bSection.style.display = admin || perms.domains0b ? "" : "none";
  }

  document.querySelectorAll('[data-add="contentidol"]').forEach((btn) => {
    btn.style.display = canEdit ? "" : "none";
  });

  document
    .querySelectorAll(
      '[data-add="domains1b"], [data-add="domains789"], [data-add="domains0b"]',
    )
    .forEach((btn) => {
      btn.style.display = admin ? "" : "none";
    });

  document.querySelectorAll(".domain-row button.danger").forEach((btn) => {
    btn.style.display = admin ? "" : "none";
  });

  document
    .querySelectorAll(".contentidol-item button.danger")
    .forEach((btn) => {
      btn.style.display = canEdit ? "" : "none";
    });

  if (els.userCard) {
    els.userCard.style.display = admin ? "" : "none";
  }

  if (els.enableFirework) els.enableFirework.disabled = false;

  [
    els.contentidolEnabled,
    els.contentidolIntervalMinutes,
    els.contentidolRepeatCount,
    els.contentidolSpeedPxPerSecond,
    els.contentidolFontSize,
    els.contentidolCopiesPerRun,
    els.contentidolCopyGapSize,
    els.contentidolLaneGapPx,
    els.contentidolShowMinutes,
    els.contentidolHideMinutes,
    els.contentidolTextColor,
    els.contentidolTextColorCode,
  ].forEach((el) => {
    if (el) el.disabled = false;
  });

  [
    els.domains1bList,
    els.domains789List,
    els.domains0bList,
    els.contentidolList,
  ].forEach((container) => {
    if (!container) return;
    container.querySelectorAll("input").forEach((input) => {
      input.disabled = false;
    });
  });
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

  currentMe = await res.json();

  if (els.meBox) {
    els.meBox.innerHTML = `User: <span class="me-name">${escapeHtml(currentMe.username)}</span>`;
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
        .map(([key, value]) => renderLogChange(key, value))
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
            - ${escapeHtml(formatDateTimeVN(log.time))}
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

  originalConfig = data.config || config;

  if (els.saveMessage) {
    els.saveMessage.textContent =
      data.message || `Saved ok. Commit: ${data.commitSha || ""}`;
  }

  await loadConfig();
  await loadLogs();
  resetIdleTimer();
}

function renderPermissionsTable(users) {
  const makeCheckbox = (username, field, checked, disabled = false) => {
    return `<input type="checkbox" data-perm-user="${escapeHtml(username)}" data-perm-field="${escapeHtml(field)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""} />`;
  };

  return `
    <div class="user-perm-table-wrap">
      <table class="user-perm-table">
        <thead>
          <tr>
            <th>Name User</th>
            <th>Role</th>
            <th>Active</th>
            <th>Must change password</th>
            <th>Reset password</th>
            <th>Content Idol</th>
            <th>Content Idol setting</th>
            <th>Domain 1B</th>
            <th>Domain 789</th>
            <th>Domain 0B</th>
          </tr>
        </thead>
        <tbody>
          ${users
            .map((user) => {
              const perms = user.permissions || {};
              const disabled = (user.role || "user") === "admin";
              return `
              <tr>
                <td>${escapeHtml(user.username)}</td>
                <td>${escapeHtml(user.role || "user")}</td>
                <td>${user.active ? "Yes" : "No"}</td>
                <td>${user.mustChangePassword ? "Yes" : "No"}</td>
                <td>
                  <button type="button" class="secondary small" data-reset-user="${escapeHtml(user.username)}">
                    Reset
                  </button>
                </td>
                <td>${makeCheckbox(user.username, "contentidol", perms.contentidol !== false, disabled)}</td>
                <td>${makeCheckbox(user.username, "contentidolSettings", perms.contentidolSettings !== false, disabled)}</td>
                <td>${makeCheckbox(user.username, "domains1b", perms.domains1b !== false, disabled)}</td>
                <td>${makeCheckbox(user.username, "domains789", perms.domains789 !== false, disabled)}</td>
                <td>${makeCheckbox(user.username, "domains0b", perms.domains0b !== false, disabled)}</td>
              </tr>
            `;
            })
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

async function bindPermissionCheckboxes() {
  document
    .querySelectorAll("[data-perm-user][data-perm-field]")
    .forEach((checkbox) => {
      checkbox.addEventListener("change", async () => {
        const username = checkbox.getAttribute("data-perm-user");
        const field = checkbox.getAttribute("data-perm-field");
        if (!username || !field) return;

        const rowChecks = Array.from(
          document.querySelectorAll(`[data-perm-user="${username}"]`),
        );
        const permissions = {
          contentidol:
            rowChecks.find(
              (x) => x.getAttribute("data-perm-field") === "contentidol",
            )?.checked ?? true,
          contentidolSettings:
            rowChecks.find(
              (x) =>
                x.getAttribute("data-perm-field") === "contentidolSettings",
            )?.checked ?? true,
          domains1b:
            rowChecks.find(
              (x) => x.getAttribute("data-perm-field") === "domains1b",
            )?.checked ?? true,
          domains789:
            rowChecks.find(
              (x) => x.getAttribute("data-perm-field") === "domains789",
            )?.checked ?? true,
          domains0b:
            rowChecks.find(
              (x) => x.getAttribute("data-perm-field") === "domains0b",
            )?.checked ?? true,
        };

        try {
          const res = await fetch("/api/users/update-permissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ username, permissions }),
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            alert(data.error || "Update permissions failed");
            await loadUsers();
            return;
          }

          resetIdleTimer();
        } catch (err) {
          alert(err.message || "Update permissions failed");
          await loadUsers();
        }
      });
    });
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

  els.usersBox.innerHTML = renderPermissionsTable(users);

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

  await bindPermissionCheckboxes();
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
    const key = btn.getAttribute("data-add");

    if (key === "contentidol") {
      if (!canEditContentIdol()) return;

      els.contentidolList?.appendChild(
        createContentIdolRow({
          text: "",
          startTime: "12:00",
          endTime: "15:00",
          enabled: true,
        }),
      );
      resetIdleTimer();
      return;
    }

    if (!isAdmin()) return;

    const map = {
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

els.contentidolTextColor?.addEventListener("input", () => {
  const color = normalizeHexColor(els.contentidolTextColor.value, "#ffffff");
  if (els.contentidolTextColorCode) {
    els.contentidolTextColorCode.value = color;
  }
  resetIdleTimer();
});

els.contentidolTextColorCode?.addEventListener("input", () => {
  const color = normalizeHexColor(els.contentidolTextColorCode.value, "");
  if (color && els.contentidolTextColor) {
    els.contentidolTextColor.value = color;
  }
  resetIdleTimer();
});

els.contentidolTextColorCode?.addEventListener("blur", () => {
  const color = normalizeHexColor(
    els.contentidolTextColorCode.value,
    els.contentidolTextColor?.value || "#ffffff",
  );
  els.contentidolTextColorCode.value = color;
  if (els.contentidolTextColor) {
    els.contentidolTextColor.value = color;
  }
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
