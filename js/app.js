let originalConfig = null;
let originalConfigRaw = null;
let originalVmixConfigs = {
  "vmix-config": null,
  "vmix-config0": null,
  "vmix-config2": null,
};
let currentMe = null;
let currentPanelId = null;
let activeVmixTarget = "vmix-config";
let activeLogView = "changeLogs";
let vmixLayersState = [];

const IDLE_LIMIT_MS = 5 * 60 * 1000;
let idleTimer = null;

const CONFIG_PANEL_IDS = [
  "generalPanel",
  "contentidolPanel",
  "contentidolSettingsPanel",
  "domains1bPanel",
  "domains789Panel",
  "domains0bPanel",
  "webscam1bPanel",
  "webscam0bPanel",
];

const VMIX_PANEL_ID = "vmixConfigPanel";
const VMIX_TARGETS = [
  { id: "vmix-config", label: "Vmix DOM 1B" },
  { id: "vmix-config0", label: "vMix DOM 0B" },
  { id: "vmix-config2", label: "vMix iDol 1B" },
];

function getVmixTargetMeta(target) {
  return VMIX_TARGETS.find((x) => x.id === target) || VMIX_TARGETS[0];
}

function getVisibleVmixTargets() {
  return VMIX_TARGETS.filter((x) => canEditVmixTarget(x.id));
}

const els = {
  topbar: document.querySelector(".topbar"),
  meBox: document.getElementById("meBox"),
  enableFirework: document.getElementById("enableFirework"),

  menuToggleBtn: document.getElementById("menuToggleBtn"),
  menuDropdown: document.getElementById("menuDropdown"),
  menuOverlay: document.getElementById("menuOverlay"),
  menuList: document.getElementById("menuList"),
  panelTitle: document.getElementById("panelTitle"),
  panelSubTitle: document.getElementById("panelSubTitle"),

  generalPanel: document.getElementById("generalPanel"),
  contentidolPanel: document.getElementById("contentidolPanel"),
  contentidolSettingsPanel: document.getElementById("contentidolSettingsPanel"),
  domains1bPanel: document.getElementById("domains1bPanel"),
  domains789Panel: document.getElementById("domains789Panel"),
  domains0bPanel: document.getElementById("domains0bPanel"),
  webscam1bPanel: document.getElementById("webscam1bPanel"),
  webscam0bPanel: document.getElementById("webscam0bPanel"),
  vmixConfigPanel: document.getElementById("vmixConfigPanel"),

  userManagementCard: document.getElementById("userManagementCard"),

  contentidolSection: document.getElementById("contentidolSection"),
  contentidolSettingsSection: document.getElementById(
    "contentidolSettingsSection",
  ),
  domains1bSection: document.getElementById("domains1bSection"),
  domains789Section: document.getElementById("domains789Section"),
  domains0bSection: document.getElementById("domains0bSection"),
  webscam1bSection: document.getElementById("webscam1bSection"),
  webscam0bSection: document.getElementById("webscam0bSection"),
  vmixConfigSection: document.getElementById("vmixConfigSection"),

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
  webscam1bList: document.getElementById("webscam1bList"),
  webscam0bList: document.getElementById("webscam0bList"),

  logsMenuGroup: document.getElementById("logsMenuGroup"),
  logsMenuBtn: document.getElementById("logsMenuBtn"),
  logsSubmenu: document.getElementById("logsSubmenu"),
  vmixMenuGroup: document.getElementById("vmixMenuGroup"),
  vmixMenuBtn: document.getElementById("vmixMenuBtn"),
  vmixSubmenu: document.getElementById("vmixSubmenu"),
  vmixEnabled: document.getElementById("vmixEnabled"),
  vmixBaseLayer: document.getElementById("vmixBaseLayer"),
  vmixBaseLayerWrap: document.getElementById("vmixBaseLayerWrap"),
  vmixLayersWrap: document.getElementById("vmixLayersWrap"),
  vmixLayersList: document.getElementById("vmixLayersList"),
  vmixLayersPreview: document.getElementById("vmixLayersPreview"),
  btnAddVmixLayer: document.getElementById("btnAddVmixLayer"),
  vmixTriggerMinutes: document.getElementById("vmixTriggerMinutes"),
  vmixEnabledWrap: document.getElementById("vmixEnabledWrap"),
  vmixTriggerHelp: document.getElementById("vmixTriggerHelp"),

  saveMessage: document.getElementById("saveMessage"),
  saveError: document.getElementById("saveError"),
  logsPanelTitle: document.getElementById("logsPanelTitle"),
  logsBox: document.getElementById("logsBox"),
  saveBtn: document.getElementById("saveBtn"),
  resetBtn: document.getElementById("resetBtn"),
  reloadBtn: document.getElementById("reloadBtn"),
  reloadLogsBtn: document.getElementById("reloadLogsBtn"),
  logoutBtn: document.getElementById("logoutBtn"),

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

function getPermissions() {
  const allowed = currentMe?.allowedPanels || [];
  return {
    contentidol: allowed.includes("contentidol"),
    contentidolSettings: allowed.includes("contentidolSettings"),
    domains1b: allowed.includes("domains1b"),
    domains789: allowed.includes("domains789"),
    domains0b: allowed.includes("domains0b"),
    webscam1b: allowed.includes("webscam1b"),
    webscam0b: allowed.includes("webscam0b"),
    vmixConfig: allowed.includes("vmixConfig"),
    vmixConfig0: allowed.includes("vmixConfig0"),
    vmixConfig2: allowed.includes("vmixConfig2"),
    enableFirework: isAdmin(),
  };
}

function canEditContentIdol() {
  return isAdmin() || getPermissions().contentidol;
}

function canEditContentIdolSettings() {
  return isAdmin() || getPermissions().contentidolSettings;
}

function canEditDomains1b() {
  return isAdmin() || getPermissions().domains1b;
}

function canEditDomains789() {
  return isAdmin() || getPermissions().domains789;
}

function canEditDomains0b() {
  return isAdmin() || getPermissions().domains0b;
}
function canEditWebscam1b() {
  return isAdmin() || getPermissions().webscam1b;
}

function canEditWebscam0b() {
  return isAdmin() || getPermissions().webscam0b;
}

function canEditVmixConfig() {
  const perms = getPermissions();
  return (
    isAdmin() || perms.vmixConfig || perms.vmixConfig0 || perms.vmixConfig2
  );
}

function canEditVmixTarget(target) {
  const perms = getPermissions();
  if (isAdmin()) return true;
  if (target === "vmix-config2") return perms.vmixConfig2;
  if (target === "vmix-config0") return perms.vmixConfig0;
  return perms.vmixConfig;
}

function canEditAnything() {
  return (
    isAdmin() ||
    canEditContentIdol() ||
    canEditContentIdolSettings() ||
    canEditDomains1b() ||
    canEditDomains789() ||
    canEditDomains0b() ||
    canEditWebscam1b() ||
    canEditWebscam0b() ||
    canEditVmixConfig()
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function setActiveLogView(view = "changeLogs") {
  activeLogView = view === "blockIps" ? "blockIps" : "changeLogs";

  if (els.logsPanelTitle) {
    els.logsPanelTitle.textContent =
      activeLogView === "blockIps" ? "Blocked IP Logs" : "Change Logs";
  }

  document
    .querySelectorAll(".logs-submenu-item[data-log-view]")
    .forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.getAttribute("data-log-view") === activeLogView,
      );
    });
}

function renderBlockIpItem(log) {
  const rawIp = log.ip || "unknown";
  const ip = escapeHtml(rawIp);
  const attempts = Number(log.attempts || 0);
  const firstSeen = escapeHtml(formatDateTimeVN(log.firstSeen || log.time));
  const lastSeen = escapeHtml(formatDateTimeVN(log.lastSeen || log.time));
  const blockedAt = log.blockedAt
    ? escapeHtml(formatDateTimeVN(log.blockedAt))
    : "-";
  const path = escapeHtml(log.path || "/");
  const ua = escapeHtml(log.userAgent || "-");
  const referer = escapeHtml(log.referer || "-");
  const country = escapeHtml(log.country || "-");
  const isBlocked = !!log.blocked;
  const status = isBlocked ? "Blocked" : "Watching";

  return `
    <div class="log-item">
      <div class="block-ip-head">
        <div class="log-meta">
          <strong>${ip}</strong> -
          <span class="block-ip-status ${isBlocked ? "is-blocked" : "is-watching"}">${status}</span>
        </div>

        <button
          type="button"
          class="secondary small block-ip-unblock-btn ${isBlocked ? "is-blocked" : ""}"
          data-unblock-ip="${escapeHtml(rawIp)}"
        >
          Unblock
        </button>
      </div>

      <div class="muted">Attempts: ${attempts}</div>

      <div class="muted">
        <strong>First seen:</strong> ${firstSeen}
        <span class="log-meta-sep">-</span>
        <strong>Last seen:</strong> ${lastSeen}
      </div>

      <div class="block-ip-grid muted">
        <div><strong>Blocked at:</strong> ${blockedAt}</div>
        <div><strong>Path:</strong> ${path}</div>
        <div><strong>Country:</strong> ${country}</div>
        <div><strong>Referer:</strong> ${referer}</div>
      </div>

      <pre>${ua}</pre>
    </div>
  `;
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

function parseLayersCsv(value) {
  return String(value || "")
    .split("|")
    .map((x) => x.trim())
    .filter(Boolean)
    .map((item) => {
      const parts = item.split(":");
      return {
        name: String(parts[0] || "").trim(),
        holdMs: normalizeNumberInput(parts[1], 10000),
      };
    })
    .filter((x) => x.name);
}

function buildLayersCsv(layers) {
  return (Array.isArray(layers) ? layers : [])
    .map((x) => ({
      name: String(x?.name || "").trim(),
      holdMs: normalizeNumberInput(x?.holdMs, 10000),
    }))
    .filter((x) => x.name)
    .map((x) => `${x.name}:${x.holdMs}`)
    .join("|");
}

function renderVmixLayers(canEdit = true) {
  if (!els.vmixLayersList) return;

  els.vmixLayersList.innerHTML = "";

  vmixLayersState.forEach((item, index) => {
    const row = document.createElement("div");
    row.className = "layer-row";

    row.innerHTML = `
      <input
        type="text"
        class="vmix-layer-name"
        data-index="${index}"
        value="${escapeHtml(String(item.name || ""))}"
        ${canEdit ? "" : "disabled"}
      />
      <input
        type="number"
        class="vmix-layer-hold"
        data-index="${index}"
        value="${Number(item.holdMs) || 0}"
        ${canEdit ? "" : "disabled"}
      />
      <div class="layer-row-actions">
        <button type="button" class="secondary small vmix-layer-up" data-index="${index}" ${canEdit ? "" : "disabled"}>↑</button>
        <button type="button" class="secondary small vmix-layer-down" data-index="${index}" ${canEdit ? "" : "disabled"}>↓</button>
        <button type="button" class="danger small vmix-layer-delete" data-index="${index}" ${canEdit ? "" : "disabled"}>×</button>
      </div>
    `;

    els.vmixLayersList.appendChild(row);
  });

  if (els.vmixLayersPreview) {
    els.vmixLayersPreview.value = buildLayersCsv(vmixLayersState);
  }
}

function normalizeTriggerMinutesInput(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((x) => Number(x))
          .filter((x) => Number.isInteger(x) && x >= 0 && x <= 59),
      ),
    ).sort((a, b) => a - b);
  }

  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((x) => Number(String(x).trim()))
        .filter((x) => Number.isInteger(x) && x >= 0 && x <= 59),
    ),
  ).sort((a, b) => a - b);
}

function normalizeTriggerTimesInput(value) {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((x) => String(x || "").trim())
          .filter((x) => /^\d{2}:\d{2}$/.test(x)),
      ),
    ).sort();
  }

  return Array.from(
    new Set(
      String(value || "")
        .split(",")
        .map((x) => String(x || "").trim())
        .filter((x) => /^\d{2}:\d{2}$/.test(x)),
    ),
  ).sort();
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

function setInputsDisabled(container, disabled) {
  if (!container) return;
  container
    .querySelectorAll("input, select, textarea, button")
    .forEach((el) => {
      el.disabled = !!disabled;
    });
}

function createDomainRow(value = "", allowEdit = false) {
  const row = document.createElement("div");
  row.className = "domain-row";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = "Example: SUNWIN.AG";
  input.disabled = !allowEdit;
  input.addEventListener("input", () => {
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.value = input.value.toUpperCase();
    input.setSelectionRange(start, end);
  });

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "danger";
  btn.textContent = "X";
  btn.style.display = allowEdit ? "" : "none";
  btn.disabled = !allowEdit;

  btn.addEventListener("click", () => {
    if (!allowEdit) return;
    row.remove();
    resetIdleTimer();
  });

  row.appendChild(input);
  row.appendChild(btn);
  return row;
}

function createWebscamRow(value = "", allowEdit = false) {
  const row = document.createElement("div");
  row.className = "webscam-row";

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.placeholder = "Example: Sunwin.lt";
  input.disabled = !allowEdit;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "danger";
  btn.textContent = "X";
  btn.style.display = allowEdit ? "" : "none";
  btn.disabled = !allowEdit;

  btn.addEventListener("click", () => {
    if (!allowEdit) return;
    row.remove();
    resetIdleTimer();
  });

  row.appendChild(input);
  row.appendChild(btn);
  return row;
}

function renderWebscamList(container, items, allowEdit = false) {
  if (!container) return;
  container.innerHTML = "";
  (items || []).forEach((item) =>
    container.appendChild(createWebscamRow(item, allowEdit)),
  );
}

function getWebscamList(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll("input"))
    .map((x) => x.value.trim())
    .filter(Boolean);
}

function renderDomainList(container, items, allowEdit = false) {
  if (!container) return;
  container.innerHTML = "";
  (items || []).forEach((item) =>
    container.appendChild(createDomainRow(item, allowEdit)),
  );
}

function getDomainList(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll("input"))
    .map((x) => x.value.trim().toUpperCase())
    .filter(Boolean);
}

function createContentIdolRow(item = {}, allowEdit = false) {
  const row = document.createElement("div");
  row.className = "contentidol-item";

  const wrap = document.createElement("div");
  wrap.className = "contentidol-inline";

  const leftWrap = document.createElement("div");
  leftWrap.className = "contentidol-left";

  const enabledWrap = document.createElement("label");
  enabledWrap.className = "contentidol-enabled";

  const enabledInput = document.createElement("input");
  enabledInput.type = "checkbox";
  enabledInput.checked = item.enabled !== false;
  enabledInput.disabled = !allowEdit;

  const enabledText = document.createElement("span");
  enabledText.textContent = "";

  enabledWrap.appendChild(enabledInput);
  enabledWrap.appendChild(enabledText);

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.placeholder = "Ví dụ: ĐANG LIVE TẠI Phòng 1";
  textInput.value = item.text || "";
  textInput.disabled = !allowEdit;
  textInput.className = "contentidol-text-input";

  leftWrap.appendChild(enabledWrap);
  leftWrap.appendChild(textInput);

  const timeActions = document.createElement("div");
  timeActions.className = "contentidol-time-actions";

  const startWrap = document.createElement("label");
  startWrap.className = "time-inline-field";
  const startLabel = document.createElement("span");
  startLabel.textContent = "Start";
  const startInput = document.createElement("input");
  startInput.type = "time";
  startInput.value = normalizeTimeValue(item.startTime, "12:00");
  startInput.disabled = !allowEdit;
  startWrap.appendChild(startLabel);
  startWrap.appendChild(startInput);

  const endWrap = document.createElement("label");
  endWrap.className = "time-inline-field";
  const endLabel = document.createElement("span");
  endLabel.textContent = "End";
  const endInput = document.createElement("input");
  endInput.type = "time";
  endInput.value = normalizeTimeValue(item.endTime, "15:00");
  endInput.disabled = !allowEdit;
  endWrap.appendChild(endLabel);
  endWrap.appendChild(endInput);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "danger";
  removeBtn.textContent = "X";
  removeBtn.style.display = allowEdit ? "" : "none";
  removeBtn.disabled = !allowEdit;

  removeBtn.addEventListener("click", () => {
    if (!allowEdit) return;
    row.remove();
    resetIdleTimer();
  });

  timeActions.appendChild(startWrap);
  timeActions.appendChild(endWrap);
  timeActions.appendChild(removeBtn);

  wrap.appendChild(leftWrap);
  wrap.appendChild(timeActions);
  row.appendChild(wrap);

  return row;
}

function renderContentIdolList(container, items, allowEdit = false) {
  if (!container) return;
  container.innerHTML = "";
  (items || []).forEach((item) => {
    container.appendChild(createContentIdolRow(item, allowEdit));
  });
}

function getContentIdolList(container) {
  if (!container) return [];

  return Array.from(container.querySelectorAll(".contentidol-item"))
    .map((row) => {
      const enabled = !!row.querySelector(
        '.contentidol-enabled input[type="checkbox"]',
      )?.checked;
      const text =
        row.querySelector(".contentidol-text-input")?.value?.trim() || "";
      const timeInputs = row.querySelectorAll(".time-inline-field input");

      const startTime = normalizeTimeValue(timeInputs[0]?.value || "", "00:00");
      const endTime = normalizeTimeValue(timeInputs[1]?.value || "", "23:59");

      return {
        text,
        startTime,
        endTime,
        enabled,
      };
    })
    .filter((item) => item.text);
}

function sanitizeConfigForCurrentUser(config) {
  const perms = getPermissions();

  return {
    enableFirework: !!config?.enableFirework,
    contentidol: perms.contentidol ? [...(config?.contentidol || [])] : [],
    contentidolSettings: perms.contentidolSettings
      ? { ...(config?.contentidolSettings || {}) }
      : {
          enabled: false,
          intervalMinutes: 5,
          repeatCount: 10,
          speedPxPerSecond: 140,
          fontSize: 48,
          copiesPerRun: 8,
          copyGapSize: 24,
          laneGapPx: 160,
          showMinutes: 0,
          hideMinutes: 0,
          textColor: "#ffffff",
        },
    domains1b: perms.domains1b ? [...(config?.domains1b || [])] : [],
    domains789: perms.domains789 ? [...(config?.domains789 || [])] : [],
    domains0b: perms.domains0b ? [...(config?.domains0b || [])] : [],
    webscam1b: perms.webscam1b ? [...(config?.webscam1b || [])] : [],
    webscam0b: perms.webscam0b ? [...(config?.webscam0b || [])] : [],
  };
}

function sanitizeVmixConfig(config, target = activeVmixTarget) {
  if (target === "vmix-config2") {
    return {
      triggerTimes: normalizeTriggerTimesInput(config?.triggerTimes || []),
    };
  }

  return {
    enabled: !!config?.enabled,
    baseLayer: String(config?.baseLayer || "LAYER 1").trim() || "LAYER 1",
    triggerMinutes: normalizeTriggerMinutesInput(config?.triggerMinutes || []),
    layersCsv: String(config?.layersCsv || "").trim(),
  };
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
    webscam1b: getWebscamList(els.webscam1bList),
    webscam0b: getWebscamList(els.webscam0bList),
  };
}

function collectConfigByPanel(panelId = currentPanelId) {
  switch (panelId) {
    case "generalPanel":
      return getPermissions().enableFirework
        ? {
            enableFirework: !!els.enableFirework?.checked,
          }
        : {};

    case "contentidolPanel":
      return canEditContentIdol()
        ? {
            contentidol: getContentIdolList(els.contentidolList),
          }
        : {};

    case "contentidolSettingsPanel":
      return canEditContentIdolSettings()
        ? {
            contentidolSettings: {
              enabled: !!els.contentidolEnabled?.checked,
              intervalMinutes: Number(
                els.contentidolIntervalMinutes?.value || 5,
              ),
              repeatCount: Number(els.contentidolRepeatCount?.value || 10),
              speedPxPerSecond: Number(
                els.contentidolSpeedPxPerSecond?.value || 140,
              ),
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
                els.contentidolTextColorCode?.value ||
                  els.contentidolTextColor?.value,
                "#ffffff",
              ),
            },
          }
        : {};

    case "domains1bPanel":
      return canEditDomains1b()
        ? {
            domains1b: getDomainList(els.domains1bList),
          }
        : {};

    case "domains789Panel":
      return canEditDomains789()
        ? {
            domains789: getDomainList(els.domains789List),
          }
        : {};

    case "domains0bPanel":
      return canEditDomains0b()
        ? {
            domains0b: getDomainList(els.domains0bList),
          }
        : {};

    case "webscam1bPanel":
      return canEditWebscam1b()
        ? {
            webscam1b: getWebscamList(els.webscam1bList),
          }
        : {};

    case "webscam0bPanel":
      return canEditWebscam0b()
        ? {
            webscam0b: getWebscamList(els.webscam0bList),
          }
        : {};

    default:
      return {};
  }
}

function collectVmixConfig(target = activeVmixTarget) {
  if (target === "vmix-config2") {
    return {
      triggerTimes: normalizeTriggerTimesInput(
        els.vmixTriggerMinutes?.value || "",
      ),
    };
  }

  const layers = (vmixLayersState || []).map((x) => ({
    name: String(x?.name || "").trim(),
    holdMs: normalizeNumberInput(x?.holdMs, 10000),
  }));

  return {
    enabled: !!els.vmixEnabled?.checked,
    baseLayer:
      String(els.vmixBaseLayer?.value || "LAYER 1").trim() || "LAYER 1",
    triggerMinutes: normalizeTriggerMinutesInput(
      els.vmixTriggerMinutes?.value || "",
    ),
    layersCsv: buildLayersCsv(layers),
  };
}

function renderConfig(config) {
  const perms = getPermissions();
  const safeConfig = sanitizeConfigForCurrentUser(config || {});

  if (els.enableFirework) {
    els.enableFirework.checked = !!safeConfig.enableFirework;
    els.enableFirework.disabled = !perms.enableFirework;
  }

  renderContentIdolList(
    els.contentidolList,
    safeConfig.contentidol || [],
    canEditContentIdol(),
  );
  renderDomainList(
    els.domains1bList,
    safeConfig.domains1b || [],
    canEditDomains1b(),
  );
  renderDomainList(
    els.domains789List,
    safeConfig.domains789 || [],
    canEditDomains789(),
  );
  renderDomainList(
    els.domains0bList,
    safeConfig.domains0b || [],
    canEditDomains0b(),
  );

  renderWebscamList(
    els.webscam1bList,
    safeConfig.webscam1b || [],
    canEditWebscam1b(),
  );
  renderWebscamList(
    els.webscam0bList,
    safeConfig.webscam0b || [],
    canEditWebscam0b(),
  );

  const s = safeConfig.contentidolSettings || {};

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
    if (el) el.disabled = !canEditContentIdolSettings();
  });
}

function updateVmixUiByTarget(target = activeVmixTarget) {
  const isMachine2 = target === "vmix-config2";
  const canEditTarget = canEditVmixTarget(target);
  const targetMeta = getVmixTargetMeta(target);

  if (els.panelSubTitle && currentPanelId === VMIX_PANEL_ID) {
    els.panelSubTitle.textContent = `Manage vmix config - ${targetMeta.label}`;
  }

  if (els.vmixEnabledWrap)
    els.vmixEnabledWrap.style.display = isMachine2 ? "none" : "";

  if (els.vmixBaseLayerWrap)
    els.vmixBaseLayerWrap.style.display = isMachine2 ? "none" : "";

  if (els.vmixLayersWrap)
    els.vmixLayersWrap.style.display = isMachine2 ? "none" : "";

  if (els.vmixTriggerMinutes) {
    els.vmixTriggerMinutes.placeholder = isMachine2
      ? "Ví dụ: 04:00,08:00,12:00"
      : "Ví dụ: 3,13,23,33,43,53";
  }

  if (els.vmixTriggerHelp) {
    els.vmixTriggerHelp.textContent = isMachine2
      ? "Máy này chỉ lưu trigger times hh:mm, cách nhau bằng dấu phẩy."
      : "Máy này lưu trigger minutes, nhập phút cách nhau bằng dấu phẩy.";
  }

  document
    .querySelectorAll(".vmix-submenu-item[data-vmix-target]")
    .forEach((btn) => {
      btn.classList.toggle(
        "active",
        btn.getAttribute("data-vmix-target") === target,
      );
    });

  if (els.vmixEnabled) els.vmixEnabled.disabled = isMachine2 || !canEditTarget;
  if (els.vmixBaseLayer)
    els.vmixBaseLayer.disabled = isMachine2 || !canEditTarget;
  if (els.vmixTriggerMinutes) els.vmixTriggerMinutes.disabled = !canEditTarget;
  if (els.btnAddVmixLayer)
    els.btnAddVmixLayer.disabled = isMachine2 || !canEditTarget;

  renderVmixLayers(!isMachine2 && canEditTarget);
}

function renderVmixConfig(config, target = activeVmixTarget) {
  const safeConfig = sanitizeVmixConfig(config || {}, target);
  originalVmixConfigs[target] = safeConfig;
  activeVmixTarget = target;

  if (target === "vmix-config2") {
    if (els.vmixEnabled) els.vmixEnabled.checked = false;
    if (els.vmixBaseLayer) els.vmixBaseLayer.value = "";
    vmixLayersState = [];
    if (els.vmixTriggerMinutes) {
      els.vmixTriggerMinutes.value = (safeConfig.triggerTimes || []).join(",");
    }
  } else {
    if (els.vmixEnabled) els.vmixEnabled.checked = !!safeConfig.enabled;
    if (els.vmixBaseLayer) {
      els.vmixBaseLayer.value = safeConfig.baseLayer || "LAYER 1";
    }
    if (els.vmixTriggerMinutes) {
      els.vmixTriggerMinutes.value = (safeConfig.triggerMinutes || []).join(
        ",",
      );
    }
    vmixLayersState = parseLayersCsv(safeConfig.layersCsv || "");
  }

  updateVmixUiByTarget(target);
}

function getAllPanels() {
  return [
    els.generalPanel,
    els.contentidolPanel,
    els.contentidolSettingsPanel,
    els.domains1bPanel,
    els.domains789Panel,
    els.domains0bPanel,
    els.vmixConfigPanel,
    els.webscam1bPanel,
    els.webscam0bPanel,
  ].filter(Boolean);
}

function getPanelMeta() {
  const perms = getPermissions();

  return [
    {
      id: "generalPanel",
      label: "General",
      subtitle: "General config",
      visible: perms.enableFirework,
      target: "config",
    },
    {
      id: "contentidolPanel",
      label: "Content Idol",
      subtitle: "Manage content idol list",
      visible: perms.contentidol,
      target: "config",
    },
    {
      id: "contentidolSettingsPanel",
      label: "Content Idol Settings",
      subtitle: "Manage content idol settings",
      visible: perms.contentidolSettings,
      target: "config",
    },
    {
      id: "domains1bPanel",
      label: "Change Dom 1B",
      subtitle: "Manage domain list 1B",
      visible: perms.domains1b,
      target: "config",
    },
    {
      id: "domains789Panel",
      label: "Change Dom 789",
      subtitle: "Manage domain list 789",
      visible: perms.domains789,
      target: "config",
    },
    {
      id: "domains0bPanel",
      label: "Change Dom 0B",
      subtitle: "Manage domain list 0B",
      visible: perms.domains0b,
      target: "config",
    },
    {
      id: "webscam1bPanel",
      label: "Webscam 1B",
      subtitle: "Manage webscam list 1B",
      visible: perms.webscam1b,
      target: "config",
    },
    {
      id: "webscam0bPanel",
      label: "Webscam 0B",
      subtitle: "Manage webscam list 0B",
      visible: perms.webscam0b,
      target: "config",
    },
    {
      id: "vmixConfigPanel",
      label: "vMix Config",
      subtitle: "Manage vmix config",
      visible: perms.vmixConfig || perms.vmixConfig0 || perms.vmixConfig2,
      target: "vmix-config",
    },
  ];
}

function getCurrentPanelMeta() {
  return getPanelMeta().find((x) => x.id === currentPanelId) || null;
}

function isVmixPanel(panelId = currentPanelId) {
  return panelId === VMIX_PANEL_ID;
}

function ensureValidVmixTarget() {
  const availableTargets = getVisibleVmixTargets();
  if (!availableTargets.length) {
    activeVmixTarget = "vmix-config";
    return;
  }

  if (!availableTargets.some((x) => x.id === activeVmixTarget)) {
    activeVmixTarget = availableTargets[0].id;
  }
}
function syncMenuTop() {
  const topbar = els.topbar;
  if (!topbar) return;

  const rect = topbar.getBoundingClientRect();
  const menuTop = Math.round(rect.bottom);

  document.documentElement.style.setProperty("--menu-top", `${menuTop}px`);
}
function openMenu() {
  syncMenuTop();

  if (els.menuDropdown) {
    els.menuDropdown.classList.remove("hidden");
    requestAnimationFrame(() => {
      els.menuDropdown?.classList.add("open");
    });
  }

  if (els.menuOverlay) {
    els.menuOverlay.classList.remove("hidden");
    requestAnimationFrame(() => {
      els.menuOverlay?.classList.add("open");
    });
  }

  document.body.classList.add("menu-open");
}

function closeMenu() {
  els.menuDropdown?.classList.remove("open");
  els.menuOverlay?.classList.remove("open");
  if (els.vmixMenuGroup) els.vmixMenuGroup.classList.remove("open");

  setTimeout(() => {
    if (!els.menuDropdown?.classList.contains("open")) {
      els.menuDropdown?.classList.add("hidden");
    }
    if (!els.menuOverlay?.classList.contains("open")) {
      els.menuOverlay?.classList.add("hidden");
    }
    document.body.classList.remove("menu-open");
  }, 1100);
}

function showPanel(panelId) {
  const panelMeta = getPanelMeta();
  const targetMeta = panelMeta.find((x) => x.id === panelId && x.visible);

  if (!targetMeta) return;

  currentPanelId = panelId;

  getAllPanels().forEach((panel) => panel.classList.remove("active"));

  const targetPanel = document.getElementById(panelId);
  if (targetPanel) targetPanel.classList.add("active");

  document.querySelectorAll(".menu-item[data-panel-id]").forEach((btn) => {
    if (btn.classList.contains("menu-item-parent")) {
      btn.classList.remove("active");
      return;
    }

    if (btn.classList.contains("vmix-submenu-item")) {
      const isActiveVmixSubItem =
        panelId === VMIX_PANEL_ID &&
        btn.getAttribute("data-vmix-target") === activeVmixTarget;

      btn.classList.toggle("active", isActiveVmixSubItem);
      return;
    }

    btn.classList.remove("active");
  });

  if (els.panelTitle) els.panelTitle.textContent = targetMeta.label;
  if (els.panelSubTitle) els.panelSubTitle.textContent = targetMeta.subtitle;

  if (isVmixPanel(panelId)) {
    ensureValidVmixTarget();
    renderVmixConfig(
      originalVmixConfigs[activeVmixTarget] || {},
      activeVmixTarget,
    );
  }

  closeMenu();
}

function refreshMenuByRole() {
  const panelMeta = getPanelMeta();

  document.querySelectorAll(".menu-item[data-panel-id]").forEach((btn) => {
    if (btn.classList.contains("vmix-submenu-item")) return;
    const panelId = btn.getAttribute("data-panel-id");
    const meta = panelMeta.find((x) => x.id === panelId);
    btn.style.display = meta?.visible ? "" : "none";
  });

  document
    .querySelectorAll(".vmix-submenu-item[data-vmix-target]")
    .forEach((btn) => {
      const target = btn.getAttribute("data-vmix-target");
      btn.style.display = canEditVmixTarget(target) ? "" : "none";
    });

  if (els.vmixMenuGroup) {
    els.vmixMenuGroup.style.display = canEditVmixConfig() ? "" : "none";
  }

  const firstVisible = panelMeta.find((x) => x.visible);

  if (!firstVisible) {
    getAllPanels().forEach((panel) => panel.classList.remove("active"));
    if (els.panelTitle) els.panelTitle.textContent = "Config";
    if (els.panelSubTitle) els.panelSubTitle.textContent = "No available menu";
    return;
  }

  const stillVisible = panelMeta.find(
    (x) => x.id === currentPanelId && x.visible,
  );
  showPanel(stillVisible ? stillVisible.id : firstVisible.id);
}

function applyRoleUi() {
  const perms = getPermissions();

  document.querySelectorAll('[data-add="contentidol"]').forEach((btn) => {
    btn.style.display = canEditContentIdol() ? "" : "none";
    btn.disabled = !canEditContentIdol();
  });

  document.querySelectorAll('[data-add="domains1b"]').forEach((btn) => {
    btn.style.display = canEditDomains1b() ? "" : "none";
    btn.disabled = !canEditDomains1b();
  });

  document.querySelectorAll('[data-add="domains789"]').forEach((btn) => {
    btn.style.display = canEditDomains789() ? "" : "none";
    btn.disabled = !canEditDomains789();
  });

  document.querySelectorAll('[data-add="domains0b"]').forEach((btn) => {
    btn.style.display = canEditDomains0b() ? "" : "none";
    btn.disabled = !canEditDomains0b();
  });

  document.querySelectorAll('[data-add="webscam1b"]').forEach((btn) => {
    btn.style.display = canEditWebscam1b() ? "" : "none";
    btn.disabled = !canEditWebscam1b();
  });

  document.querySelectorAll('[data-add="webscam0b"]').forEach((btn) => {
    btn.style.display = canEditWebscam0b() ? "" : "none";
    btn.disabled = !canEditWebscam0b();
  });

  if (els.addUserBtn) {
    els.addUserBtn.style.display = isAdmin() ? "" : "none";
    els.addUserBtn.disabled = !isAdmin();
  }

  if (els.reloadUsersBtn) {
    els.reloadUsersBtn.style.display = isAdmin() ? "" : "none";
    els.reloadUsersBtn.disabled = !isAdmin();
  }

  if (els.userManagementCard) {
    els.userManagementCard.classList.toggle("hidden", !isAdmin());
  }

  if (els.saveBtn) {
    els.saveBtn.style.display = canEditAnything() ? "" : "none";
    els.saveBtn.disabled = !canEditAnything();
  }

  if (els.resetBtn) {
    els.resetBtn.style.display = canEditAnything() ? "" : "none";
    els.resetBtn.disabled = !canEditAnything();
  }

  setInputsDisabled(els.contentidolList, !canEditContentIdol());
  setInputsDisabled(els.domains1bList, !canEditDomains1b());
  setInputsDisabled(els.domains789List, !canEditDomains789());
  setInputsDisabled(els.domains0bList, !canEditDomains0b());
  setInputsDisabled(els.webscam1bList, !canEditWebscam1b());
  setInputsDisabled(els.webscam0bList, !canEditWebscam0b());

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
    if (el) el.disabled = !canEditContentIdolSettings();
  });

  if (els.enableFirework) {
    els.enableFirework.disabled = !perms.enableFirework;
  }

  ensureValidVmixTarget();
  updateVmixUiByTarget(activeVmixTarget);
  refreshMenuByRole();
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
  const res = await fetch("/api/config?target=config", {
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = "/";
      return;
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Cannot load config");
  }

  const data = await res.json();
  originalConfigRaw = JSON.parse(JSON.stringify(data.config || {}));
  originalConfig = sanitizeConfigForCurrentUser(data.config || {});
  renderConfig(originalConfig);
}

async function loadVmixConfig(target = activeVmixTarget) {
  if (!canEditVmixTarget(target)) {
    originalVmixConfigs[target] = sanitizeVmixConfig({}, target);
    if (target === activeVmixTarget) {
      renderVmixConfig({}, target);
    }
    return;
  }

  const res = await fetch(`/api/config?target=${encodeURIComponent(target)}`, {
    credentials: "include",
  });

  if (!res.ok) {
    if (res.status === 401) {
      window.location.href = "/";
      return;
    }
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Cannot load vmix config");
  }

  const data = await res.json();
  originalVmixConfigs[target] = sanitizeVmixConfig(data.config || {}, target);

  if (target === activeVmixTarget) {
    renderVmixConfig(originalVmixConfigs[target], target);
  }
}

async function loadAllVmixConfigs() {
  for (const vmixTarget of VMIX_TARGETS) {
    if (canEditVmixTarget(vmixTarget.id)) {
      await loadVmixConfig(vmixTarget.id);
    } else {
      originalVmixConfigs[vmixTarget.id] = sanitizeVmixConfig(
        {},
        vmixTarget.id,
      );
    }
  }

  if (canEditVmixTarget(activeVmixTarget)) {
    renderVmixConfig(
      originalVmixConfigs[activeVmixTarget] || {},
      activeVmixTarget,
    );
  }
}

async function loadAllConfigs() {
  if (els.saveError) els.saveError.textContent = "";
  if (els.saveMessage) els.saveMessage.textContent = "";

  await loadConfig();
  await loadAllVmixConfigs();

  applyRoleUi();
}

async function loadChangeLogs() {
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

      const targetMeta = log.target
        ? `<div class="muted">Target: ${escapeHtml(log.target)}</div>`
        : "";

      return `
        <div class="log-item">
          <div class="log-meta">
            <strong>${escapeHtml(log.user || "unknown")}</strong>
            (${escapeHtml(log.role || "user")})
            - ${escapeHtml(formatDateTimeVN(log.time))}
          </div>
          ${targetMeta}
          ${adminMeta}
          ${changesHtml || `<div class="muted">No detail</div>`}
        </div>
      `;
    })
    .join("");
}

async function loadBlockIpLogs() {
  if (!els.logsBox) return;

  els.logsBox.innerHTML = "Loading...";
  const res = await fetch("/api/block-ips", { credentials: "include" });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    els.logsBox.innerHTML = `<div class="error">${escapeHtml(data.error || "Cannot load blocked IP logs")}</div>`;
    return;
  }

  const data = await res.json();
  const logs = Array.isArray(data.logs) ? data.logs : [];

  if (!logs.length) {
    els.logsBox.innerHTML = `<div class="muted">Chưa có blocked IP log</div>`;
    return;
  }

  els.logsBox.innerHTML = logs.map((log) => renderBlockIpItem(log)).join("");
}

async function unblockBlockedIp(ip) {
  const targetIp = String(ip || "").trim();
  if (!targetIp) return;

  const ok = window.confirm(`Unblock IP ${targetIp}?`);
  if (!ok) return;

  const res = await fetch("/api/block-ips/unblock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ip: targetIp }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Cannot unblock IP");
  }
}

async function loadLogs() {
  setActiveLogView(activeLogView);

  if (activeLogView === "blockIps") {
    await loadBlockIpLogs();
    return;
  }

  await loadChangeLogs();
}

async function saveConfig() {
  if (!canEditAnything()) {
    if (els.saveError) {
      els.saveError.textContent = "Bạn không có quyền chỉnh sửa.";
    }
    return;
  }

  if (els.saveError) els.saveError.textContent = "";
  if (els.saveMessage) els.saveMessage.textContent = "Saving...";

  try {
    const currentMeta = getCurrentPanelMeta();
    let target = currentMeta?.target || "config";

    if (isVmixPanel()) {
      target = activeVmixTarget;
      if (!canEditVmixTarget(target)) {
        throw new Error("Bạn không có quyền chỉnh sửa máy vMix này.");
      }
    }

    const payloadConfig =
      target === "config"
        ? collectConfigByPanel(currentPanelId)
        : collectVmixConfig(target);

    const res = await fetch("/api/config/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ config: payloadConfig, target }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || "Save failed");
    }

    if (target === "config") {
      originalConfig = sanitizeConfigForCurrentUser(
        data.config || payloadConfig,
      );
      renderConfig(originalConfig);
    } else {
      originalVmixConfigs[target] = sanitizeVmixConfig(
        data.config || payloadConfig,
        target,
      );
      renderVmixConfig(originalVmixConfigs[target], target);
    }

    applyRoleUi();

    if (els.saveMessage) {
      els.saveMessage.textContent = "Saved successfully.";
    }

    resetIdleTimer();
    await loadLogs();
  } catch (err) {
    if (els.saveMessage) els.saveMessage.textContent = "";
    if (els.saveError) {
      els.saveError.textContent = err.message || "Save failed";
    }
  }
}

async function changePassword(payload) {
  const res = await fetch("/api/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Change password failed");
  }

  return data;
}

async function createUser(username) {
  const res = await fetch("/api/users/add", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Create user failed");
  }

  return data;
}
async function deleteUser(username) {
  const res = await fetch("/api/users/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || "Delete user failed");
  }

  return data;
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
            <th class="sticky-col sticky-col-1 col-user">Name User</th>
            <th class="sticky-col sticky-col-2 col-role">Role</th>
            <th class="sticky-col sticky-col-3 col-active">Active</th>
            <th class="sticky-col sticky-col-4 col-must-change">Must change password</th>
            <th class="sticky-col sticky-col-5 col-reset">Reset password</th>
            <th>Content Idol</th>
            <th>Content Idol setting</th>
            <th>Domain 1B</th>
            <th>Domain 789</th>
            <th>Domain 0B</th>
            <th>Webscam 1B</th>
            <th>Webscam 0B</th>
            <th>vMix DOM 1B</th>
            <th>vMix DOM 0B</th>
            <th>vMix iDol 1B</th>
          </tr>
        </thead>
        <tbody>
          ${users
            .map((user) => {
              const isAdminRow = (user.role || "user") === "admin";
              const perms = isAdminRow
                ? {
                    contentidol: true,
                    contentidolSettings: true,
                    domains1b: true,
                    domains789: true,
                    domains0b: true,
                    webscam1b: true,
                    webscam0b: true,
                    vmixConfig: true,
                    vmixConfig0: true,
                    vmixConfig2: true,
                  }
                : user.permissions || {};

              const disabled = isAdminRow;
              const canDelete =
                (user.role || "user") !== "admin" &&
                user.username !== currentMe?.username;

              return `
              <tr>
                <td class="sticky-col sticky-col-1 col-user">
                  ${
                    canDelete
                      ? `
                    <div class="user-name-chip">
                      <span class="user-name-text">${escapeHtml(user.username)}</span>
                      <button
                        type="button"
                        class="user-delete-btn"
                        data-delete-user="${escapeHtml(user.username)}"
                        title="Delete user"
                        aria-label="Delete user ${escapeHtml(user.username)}"
                      >
                        <span class="user-delete-btn-x">✕</span>
                      </button>
                    </div>
                  `
                      : `
                    <span class="user-name-text">${escapeHtml(user.username)}</span>
                  `
                  }
                </td>

                <td class="sticky-col sticky-col-2 col-role">${escapeHtml(user.role || "user")}</td>
                <td class="sticky-col sticky-col-3 col-active">${user.active ? "Yes" : "No"}</td>
                <td class="sticky-col sticky-col-4 col-must-change">${user.mustChangePassword ? "Yes" : "No"}</td>
                <td class="sticky-col sticky-col-5 col-reset">
                  <button type="button" class="secondary small" data-reset-user="${escapeHtml(user.username)}">
                    Reset
                  </button>
                </td>
                <td>${makeCheckbox(user.username, "contentidol", !!perms.contentidol, disabled)}</td>
                <td>${makeCheckbox(user.username, "contentidolSettings", !!perms.contentidolSettings, disabled)}</td>
                <td>${makeCheckbox(user.username, "domains1b", !!perms.domains1b, disabled)}</td>
                <td>${makeCheckbox(user.username, "domains789", !!perms.domains789, disabled)}</td>
                <td>${makeCheckbox(user.username, "domains0b", !!perms.domains0b, disabled)}</td>
                <td>${makeCheckbox(user.username, "webscam1b", !!perms.webscam1b, disabled)}</td>
                <td>${makeCheckbox(user.username, "webscam0b", !!perms.webscam0b, disabled)}</td>
                <td>${makeCheckbox(user.username, "vmixConfig", !!perms.vmixConfig, disabled)}</td>
                <td>${makeCheckbox(user.username, "vmixConfig0", !!perms.vmixConfig0, disabled)}</td>
                <td>${makeCheckbox(user.username, "vmixConfig2", !!perms.vmixConfig2, disabled)}</td>
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
        if (!username) return;

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
          webscam1b:
            rowChecks.find(
              (x) => x.getAttribute("data-perm-field") === "webscam1b",
            )?.checked ?? true,
          webscam0b:
            rowChecks.find(
              (x) => x.getAttribute("data-perm-field") === "webscam0b",
            )?.checked ?? true,
          vmixConfig:
            rowChecks.find(
              (x) => x.getAttribute("data-perm-field") === "vmixConfig",
            )?.checked ?? true,
          vmixConfig0:
            rowChecks.find(
              (x) => x.getAttribute("data-perm-field") === "vmixConfig0",
            )?.checked ?? true,
          vmixConfig2:
            rowChecks.find(
              (x) => x.getAttribute("data-perm-field") === "vmixConfig2",
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
  document.querySelectorAll("[data-delete-user]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const username = btn.getAttribute("data-delete-user");
      if (!username) return;

      const ok = window.confirm(`Do you want to delete user "${username}"?`);
      if (!ok) return;

      try {
        const data = await deleteUser(username);
        alert(data.message || `Deleted user: ${username}`);
        await loadUsers();
        resetIdleTimer();
      } catch (err) {
        alert(err.message || "Delete user failed");
      }
    });
  });
  await bindPermissionCheckboxes();
}

function openForcePasswordModal() {
  if (!els.passwordModal) return;
  els.passwordError.textContent = "";
  els.passwordOk.textContent = "";
  if (els.currentPasswordWrap) {
    els.currentPasswordWrap.classList.add("hidden");
  }
  if (els.passwordModalText) {
    els.passwordModalText.textContent =
      "Bạn cần đổi password trước khi tiếp tục sử dụng.";
  }
  els.passwordModal.classList.remove("hidden");
}

function closePasswordModal() {
  if (!els.passwordModal) return;
  els.passwordModal.classList.add("hidden");
  els.passwordForm?.reset();
}

function openAddUserModal() {
  if (!els.addUserModal) return;
  els.addUserError.textContent = "";
  els.addUserOk.textContent = "";
  els.addUserForm?.reset();
  els.addUserModal.classList.remove("hidden");
}

function closeAddUserModal() {
  if (!els.addUserModal) return;
  els.addUserModal.classList.add("hidden");
  els.addUserForm?.reset();
}

function bindMenuUi() {
  els.menuToggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();

    if (els.menuDropdown?.classList.contains("hidden")) {
      openMenu();
    } else {
      closeMenu();
    }

    resetIdleTimer();
  });

  document.querySelectorAll(".menu-item[data-panel-id]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      if (btn.classList.contains("vmix-submenu-item")) return;
      if (btn.classList.contains("menu-item-parent")) return;

      const panelId = btn.getAttribute("data-panel-id");
      if (!panelId) return;

      showPanel(panelId);
      resetIdleTimer();
    });
  });

  els.logsMenuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    resetIdleTimer();
  });

  document
    .querySelectorAll(".logs-submenu-item[data-log-view]")
    .forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const view = btn.getAttribute("data-log-view") || "changeLogs";
        setActiveLogView(view);
        await loadLogs();
        closeMenu();
        resetIdleTimer();
      });
    });

  els.vmixMenuBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    resetIdleTimer();
  });

  document
    .querySelectorAll(".vmix-submenu-item[data-vmix-target]")
    .forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();

        const target = btn.getAttribute("data-vmix-target");
        if (!target || !canEditVmixTarget(target)) return;

        activeVmixTarget = target;
        showPanel(VMIX_PANEL_ID);

        if (originalVmixConfigs[target]) {
          renderVmixConfig(originalVmixConfigs[target], target);
        } else {
          await loadVmixConfig(target);
        }

        closeMenu();
        resetIdleTimer();
      });
    });

  els.menuOverlay?.addEventListener("click", () => {
    closeMenu();
    resetIdleTimer();
  });

  document.addEventListener("click", (e) => {
    const insideMenu =
      e.target.closest(".menu-wrap") ||
      e.target.closest(".menu-dropdown") ||
      e.target.closest(".menu-submenu");

    if (
      els.menuDropdown &&
      !els.menuDropdown.classList.contains("hidden") &&
      !insideMenu
    ) {
      closeMenu();
    }
  });
}

document.querySelectorAll("[data-add]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const key = btn.getAttribute("data-add");

    if (key === "contentidol") {
      if (!canEditContentIdol()) return;

      els.contentidolList?.appendChild(
        createContentIdolRow(
          {
            text: "",
            startTime: "12:00",
            endTime: "15:00",
            enabled: true,
          },
          true,
        ),
      );
      resetIdleTimer();
      return;
    }

    const domainPermissionMap = {
      domains1b: canEditDomains1b(),
      domains789: canEditDomains789(),
      domains0b: canEditDomains0b(),
      webscam1b: canEditWebscam1b(),
      webscam0b: canEditWebscam0b(),
    };

    if (!domainPermissionMap[key]) return;

    const map = {
      domains1b: els.domains1bList,
      domains789: els.domains789List,
      domains0b: els.domains0bList,
      webscam1b: els.webscam1bList,
      webscam0b: els.webscam0bList,
    };

    if (key === "webscam1b" || key === "webscam0b") {
      map[key]?.appendChild(createWebscamRow("", true));
    } else {
      map[key]?.appendChild(createDomainRow("", true));
    }
    resetIdleTimer();
  });
});

els.saveBtn?.addEventListener("click", saveConfig);

els.resetBtn?.addEventListener("click", () => {
  if (isVmixPanel()) {
    renderVmixConfig(
      originalVmixConfigs[activeVmixTarget] || {},
      activeVmixTarget,
    );
  } else {
    renderConfig(originalConfig || {});
  }
  applyRoleUi();
  resetIdleTimer();
});

els.reloadBtn?.addEventListener("click", async () => {
  await loadAllConfigs();
  resetIdleTimer();
});

els.reloadLogsBtn?.addEventListener("click", async () => {
  await loadLogs();
  resetIdleTimer();
});
els.logsBox?.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-unblock-ip]");
  if (!btn) return;

  const ip = btn.getAttribute("data-unblock-ip") || "";

  try {
    await unblockBlockedIp(ip);
    await loadLogs();
    resetIdleTimer();
  } catch (err) {
    window.alert(err.message || "Cannot unblock IP");
  }
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
    els.contentidolTextColorCode?.value,
    "#ffffff",
  );
  if (els.contentidolTextColorCode) {
    els.contentidolTextColorCode.value = color;
  }
  if (els.contentidolTextColor) {
    els.contentidolTextColor.value = color;
  }
  resetIdleTimer();
});

els.btnAddVmixLayer?.addEventListener("click", () => {
  if (activeVmixTarget === "vmix-config2") return;
  if (!canEditVmixTarget(activeVmixTarget)) return;

  vmixLayersState.push({ name: "", holdMs: 10000 });
  renderVmixLayers(canEditVmixTarget(activeVmixTarget));
  resetIdleTimer();
});

els.vmixLayersList?.addEventListener("input", (e) => {
  const idx = Number(e.target?.getAttribute("data-index"));
  if (!Number.isInteger(idx) || idx < 0 || idx >= vmixLayersState.length)
    return;

  if (e.target.classList.contains("vmix-layer-name")) {
    vmixLayersState[idx].name = e.target.value;
  }

  if (e.target.classList.contains("vmix-layer-hold")) {
    vmixLayersState[idx].holdMs = normalizeNumberInput(e.target.value, 10000);
  }

  if (els.vmixLayersPreview) {
    els.vmixLayersPreview.value = buildLayersCsv(vmixLayersState);
  }
});

els.vmixLayersList?.addEventListener("click", (e) => {
  const idx = Number(e.target?.getAttribute("data-index"));
  if (!Number.isInteger(idx) || idx < 0 || idx >= vmixLayersState.length)
    return;

  if (e.target.classList.contains("vmix-layer-delete")) {
    vmixLayersState.splice(idx, 1);
    renderVmixLayers(canEditVmixTarget(activeVmixTarget));
    return;
  }

  if (e.target.classList.contains("vmix-layer-up")) {
    if (idx <= 0) return;
    const tmp = vmixLayersState[idx - 1];
    vmixLayersState[idx - 1] = vmixLayersState[idx];
    vmixLayersState[idx] = tmp;
    renderVmixLayers(canEditVmixTarget(activeVmixTarget));
    return;
  }

  if (e.target.classList.contains("vmix-layer-down")) {
    if (idx >= vmixLayersState.length - 1) return;
    const tmp = vmixLayersState[idx + 1];
    vmixLayersState[idx + 1] = vmixLayersState[idx];
    vmixLayersState[idx] = tmp;
    renderVmixLayers(canEditVmixTarget(activeVmixTarget));
  }
});

els.passwordForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  els.passwordError.textContent = "";
  els.passwordOk.textContent = "";

  const currentPasswordVisible =
    !els.currentPasswordWrap.classList.contains("hidden");

  const currentPassword = els.currentPassword?.value || "";
  const newPassword = els.newPassword?.value || "";
  const confirmPassword = els.confirmPassword?.value || "";

  if (!newPassword || !confirmPassword) {
    els.passwordError.textContent = "Vui lòng nhập đầy đủ thông tin.";
    return;
  }

  if (newPassword !== confirmPassword) {
    els.passwordError.textContent = "Xác nhận password không khớp.";
    return;
  }

  try {
    await changePassword({
      currentPassword: currentPasswordVisible ? currentPassword : undefined,
      newPassword,
      confirmPassword,
    });

    els.passwordOk.textContent = "Đổi password thành công.";
    resetIdleTimer();

    setTimeout(async () => {
      closePasswordModal();
      await ensureMe();

      if (currentMe?.mustChangePassword) {
        openForcePasswordModal();
      }
    }, 700);
  } catch (err) {
    els.passwordError.textContent =
      err.message || "Đổi password không thành công.";
  }
});

els.addUserForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!isAdmin()) return;

  els.addUserError.textContent = "";
  els.addUserOk.textContent = "";

  const username = (els.addUsername?.value || "").trim();

  if (!username) {
    els.addUserError.textContent = "Vui lòng nhập username.";
    return;
  }

  try {
    const data = await createUser(username);
    els.addUserOk.textContent = `Tạo user thành công. Password tạm: ${data.tempPassword}`;
    await loadUsers();
    resetIdleTimer();

    setTimeout(() => {
      closeAddUserModal();
    }, 1200);
  } catch (err) {
    els.addUserError.textContent = err.message || "Tạo user thất bại.";
  }
});

async function init() {
  bindIdleEvents();
  bindMenuUi();
  syncMenuTop();
  await ensureMe();
  ensureValidVmixTarget();
  await loadAllConfigs();
  setActiveLogView(activeLogView);
  await loadLogs();
  if (isAdmin()) {
    await loadUsers();
  }
  refreshMenuByRole();
  resetIdleTimer();
}
window.addEventListener("resize", syncMenuTop);
window.addEventListener("scroll", syncMenuTop, { passive: true });
window.addEventListener("load", async () => {
  try {
    await init();

    if (currentMe?.mustChangePassword) {
      openForcePasswordModal();
    }
  } catch (err) {
    console.error(err);
    if (els.saveError) {
      els.saveError.textContent = err.message || "Init failed";
    }
  }
});
