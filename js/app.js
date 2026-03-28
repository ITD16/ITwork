let originalConfig = null;
let originalVmixConfigs = {
  "vmix-config": null,
  "vmix-config2": null,
};
let currentMe = null;
let currentPanelId = null;
let activeVmixTarget = "vmix-config";

const IDLE_LIMIT_MS = 5 * 60 * 1000;
let idleTimer = null;

const CONFIG_PANEL_IDS = [
  "generalPanel",
  "contentidolPanel",
  "contentidolSettingsPanel",
  "domains1bPanel",
  "domains789Panel",
  "domains0bPanel",
];

const VMIX_PANEL_ID = "vmixConfigPanel";
const VMIX_TARGETS = [
  { id: "vmix-config", label: "Vmix DOM 1B" },
  { id: "vmix-config2", label: "vMix iDol 1B" },
];

const els = {
  meBox: document.getElementById("meBox"),
  enableFirework: document.getElementById("enableFirework"),

  menuToggleBtn: document.getElementById("menuToggleBtn"),
  menuDropdown: document.getElementById("menuDropdown"),
  menuList: document.getElementById("menuList"),
  panelTitle: document.getElementById("panelTitle"),
  panelSubTitle: document.getElementById("panelSubTitle"),

  generalPanel: document.getElementById("generalPanel"),
  contentidolPanel: document.getElementById("contentidolPanel"),
  contentidolSettingsPanel: document.getElementById("contentidolSettingsPanel"),
  domains1bPanel: document.getElementById("domains1bPanel"),
  domains789Panel: document.getElementById("domains789Panel"),
  domains0bPanel: document.getElementById("domains0bPanel"),
  vmixConfigPanel: document.getElementById("vmixConfigPanel"),

  userManagementCard: document.getElementById("userManagementCard"),

  contentidolSection: document.getElementById("contentidolSection"),
  contentidolSettingsSection: document.getElementById(
    "contentidolSettingsSection",
  ),
  domains1bSection: document.getElementById("domains1bSection"),
  domains789Section: document.getElementById("domains789Section"),
  domains0bSection: document.getElementById("domains0bSection"),
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

  vmixEnabled: document.getElementById("vmixEnabled"),
  vmixHoldLayer2Ms: document.getElementById("vmixHoldLayer2Ms"),
  vmixHoldLayer3Ms: document.getElementById("vmixHoldLayer3Ms"),
  vmixTriggerMinutes: document.getElementById("vmixTriggerMinutes"),
  vmixEnabledWrap: document.getElementById("vmixEnabledWrap"),
  vmixHoldLayer2Wrap: document.getElementById("vmixHoldLayer2Wrap"),
  vmixHoldLayer3Wrap: document.getElementById("vmixHoldLayer3Wrap"),
  vmixTriggerHelp: document.getElementById("vmixTriggerHelp"),

  saveMessage: document.getElementById("saveMessage"),
  saveError: document.getElementById("saveError"),
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
  const perms = currentMe?.permissions || {};
  return {
    contentidol: perms.contentidol !== false,
    contentidolSettings: perms.contentidolSettings !== false,
    domains1b: perms.domains1b !== false,
    domains789: perms.domains789 !== false,
    domains0b: perms.domains0b !== false,
    vmixConfig: perms.vmixConfig !== false,
    vmixConfig2: perms.vmixConfig2 !== false,
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

function canEditVmixConfig() {
  const perms = getPermissions();
  return isAdmin() || perms.vmixConfig || perms.vmixConfig2;
}

function canEditVmixTarget(target) {
  const perms = getPermissions();
  if (isAdmin()) return true;
  if (target === "vmix-config2") return perms.vmixConfig2;
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

  const textInput = document.createElement("input");
  textInput.type = "text";
  textInput.placeholder = "Ví dụ: ĐANG LIVE TẠI Phòng 1";
  textInput.value = item.text || "";
  textInput.disabled = !allowEdit;

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

  wrap.appendChild(textInput);
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
  };
}

function sanitizeVmixConfig(config, target = activeVmixTarget) {
  if (target === "vmix-config2") {
    return {
      triggerTimes: normalizeTriggerTimesInput(config?.triggerTimes || []),
    };
  }

  return {
    holdLayer2Ms: normalizeNumberInput(config?.holdLayer2Ms, 60000),
    holdLayer3Ms: normalizeNumberInput(config?.holdLayer3Ms, 120000),
    triggerMinutes: normalizeTriggerMinutesInput(config?.triggerMinutes || []),
    enabled: !!config?.enabled,
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
  };
}


function collectVmixConfig(target = activeVmixTarget) {
  if (target === "vmix-config2") {
    return {
      triggerTimes: normalizeTriggerTimesInput(
        els.vmixTriggerMinutes?.value || "",
      ),
    };
  }

  return {
    enabled: !!els.vmixEnabled?.checked,
    holdLayer2Ms: normalizeNumberInput(els.vmixHoldLayer2Ms?.value, 60000),
    holdLayer3Ms: normalizeNumberInput(els.vmixHoldLayer3Ms?.value, 120000),
    triggerMinutes: normalizeTriggerMinutesInput(
      els.vmixTriggerMinutes?.value || "",
    ),
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

  if (els.vmixEnabledWrap) {
    els.vmixEnabledWrap.style.display = isMachine2 ? "none" : "";
  }
  if (els.vmixHoldLayer2Wrap) {
    els.vmixHoldLayer2Wrap.style.display = isMachine2 ? "none" : "";
  }
  if (els.vmixHoldLayer3Wrap) {
    els.vmixHoldLayer3Wrap.style.display = isMachine2 ? "none" : "";
  }

  if (els.vmixTriggerMinutes) {
    els.vmixTriggerMinutes.placeholder = isMachine2
      ? "Ví dụ: 04:00,08:00,12:00..."
      : "Ví dụ: 3,33";
  }

  if (els.vmixTriggerHelp) {
    els.vmixTriggerHelp.textContent = isMachine2
      ? "Máy này chỉ lưu trigger times, nhập thời gian theo mẫu hh:mm, cách nhau bằng dấu phẩy, không có khoảng trắng."
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
  if (els.vmixHoldLayer2Ms) {
    els.vmixHoldLayer2Ms.disabled = isMachine2 || !canEditTarget;
  }
  if (els.vmixHoldLayer3Ms) {
    els.vmixHoldLayer3Ms.disabled = isMachine2 || !canEditTarget;
  }
  if (els.vmixTriggerMinutes) {
    els.vmixTriggerMinutes.disabled = !canEditTarget;
  }
}

function renderVmixConfig(config, target = activeVmixTarget) {
  const safeConfig = sanitizeVmixConfig(config || {}, target);
  originalVmixConfigs[target] = safeConfig;

  activeVmixTarget = target;

  if (target === "vmix-config2") {
    if (els.vmixEnabled) els.vmixEnabled.checked = false;
    if (els.vmixHoldLayer2Ms) els.vmixHoldLayer2Ms.value = "";
    if (els.vmixHoldLayer3Ms) els.vmixHoldLayer3Ms.value = "";
    if (els.vmixTriggerMinutes) {
      els.vmixTriggerMinutes.value = (safeConfig.triggerTimes || []).join(",");
    }
  } else {
    if (els.vmixEnabled) els.vmixEnabled.checked = !!safeConfig.enabled;
    if (els.vmixHoldLayer2Ms)
      els.vmixHoldLayer2Ms.value = safeConfig.holdLayer2Ms;
    if (els.vmixHoldLayer3Ms)
      els.vmixHoldLayer3Ms.value = safeConfig.holdLayer3Ms;
    if (els.vmixTriggerMinutes)
      els.vmixTriggerMinutes.value = (safeConfig.triggerMinutes || []).join(",");
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
      id: "vmixConfigPanel",
      label: "vMix Config",
      subtitle: "Manage vmix config",
      visible: perms.vmixConfig || perms.vmixConfig2,
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
  const availableTargets = VMIX_TARGETS.filter((x) => canEditVmixTarget(x.id));
  if (!availableTargets.length) {
    activeVmixTarget = "vmix-config";
    return;
  }

  if (!availableTargets.some((x) => x.id === activeVmixTarget)) {
    activeVmixTarget = availableTargets[0].id;
  }

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

  if (els.menuDropdown) {
    els.menuDropdown.classList.add("hidden");
  }
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
      originalVmixConfigs[vmixTarget.id] = sanitizeVmixConfig({}, vmixTarget.id);
    }
  }

  if (canEditVmixTarget(activeVmixTarget)) {
    renderVmixConfig(originalVmixConfigs[activeVmixTarget] || {}, activeVmixTarget);
  }
}

async function loadAllConfigs() {
  if (els.saveError) els.saveError.textContent = "";
  if (els.saveMessage) els.saveMessage.textContent = "";

  await loadConfig();
  await loadAllVmixConfigs();

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
      activeVmixTarget = target;
      if (!canEditVmixTarget(target)) {
        throw new Error("Bạn không có quyền chỉnh sửa máy vMix này.");
      }
    }

    const payloadConfig =
      target === "config" ? collectConfig() : collectVmixConfig(target);

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
            <th>vMix DOM 1B</th>
            <th>vMix iDol 1B</th>
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
                <td>${makeCheckbox(user.username, "vmixConfig", perms.vmixConfig !== false, disabled)}</td>
                <td>${makeCheckbox(user.username, "vmixConfig2", perms.vmixConfig2 !== false, disabled)}</td>
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
          vmixConfig:
            rowChecks.find(
              (x) => x.getAttribute("data-perm-field") === "vmixConfig",
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
  let vmixHoverTimer = null;

  els.menuToggleBtn?.addEventListener("click", (e) => {
    e.stopPropagation();
    els.menuDropdown?.classList.toggle("hidden");
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

  if (els.vmixMenuGroup) {
    els.vmixMenuGroup.addEventListener("mouseenter", () => {
      if (vmixHoverTimer) clearTimeout(vmixHoverTimer);
      els.vmixMenuGroup.classList.add("open");
    });

    els.vmixMenuGroup.addEventListener("mouseleave", () => {
      vmixHoverTimer = setTimeout(() => {
        els.vmixMenuGroup?.classList.remove("open");
      }, 180);
    });
  }

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

        if (els.menuDropdown) els.menuDropdown.classList.add("hidden");
        if (els.vmixMenuGroup) els.vmixMenuGroup.classList.remove("open");

        resetIdleTimer();
      });
    });

  document.addEventListener("click", (e) => {
    if (
      els.menuDropdown &&
      !els.menuDropdown.classList.contains("hidden") &&
      !e.target.closest(".menu-wrap")
    ) {
      els.menuDropdown.classList.add("hidden");
      els.vmixMenuGroup?.classList.remove("open");
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
    };

    if (!domainPermissionMap[key]) return;

    const map = {
      domains1b: els.domains1bList,
      domains789: els.domains789List,
      domains0b: els.domains0bList,
    };

    map[key]?.appendChild(createDomainRow("", true));
    resetIdleTimer();
  });
});


els.saveBtn?.addEventListener("click", saveConfig);

els.resetBtn?.addEventListener("click", () => {
  if (isVmixPanel()) {
    const target = activeVmixTarget;
    renderVmixConfig(originalVmixConfigs[target] || {}, target);
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
  await ensureMe();
  ensureValidVmixTarget();
  await loadAllConfigs();
  await loadLogs();
  if (isAdmin()) {
    await loadUsers();
  }
  refreshMenuByRole();
  resetIdleTimer();
}

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
