// js/devtools-guard.js
(function () {
  const THRESHOLD = 140;
  const REDIRECT_URL = "https://itvip.netlify.app/404";

  let redirected = false;
  let bypassEnabled = false;

  const pressedKeys = new Set();

  function goRedirect() {
    if (redirected || bypassEnabled) return;
    redirected = true;
    window.location.replace(REDIRECT_URL);
  }

  function isBypassCombo(e) {
    const key = (e.key || "").toLowerCase();
    return e.metaKey && key === "u" && pressedKeys.has("i");
  }

  // Chặn chuột phải
  document.addEventListener("contextmenu", function (e) {
    if (bypassEnabled) return;
    e.preventDefault();
  });

  document.addEventListener(
    "keydown",
    function (e) {
      const key = (e.key || "").toLowerCase();
      pressedKeys.add(key);

      // Cmd + I + U => tắt toàn bộ cơ chế chặn/detect
      if (isBypassCombo(e)) {
        bypassEnabled = true;
        return true;
      }

      if (bypassEnabled) return true;

      const blocked =
        e.key === "F12" ||
        ((e.ctrlKey || e.metaKey) && key === "u") ||
        ((e.ctrlKey || e.metaKey) && key === "s") ||
        (e.ctrlKey && e.shiftKey && ["i", "j", "c"].includes(key)) ||
        (e.metaKey && e.altKey && ["i", "j", "c"].includes(key));

      if (blocked) {
        e.preventDefault();
        e.stopPropagation();
        goRedirect();
        return false;
      }
    },
    true,
  );

  document.addEventListener("keyup", function (e) {
    const key = (e.key || "").toLowerCase();
    pressedKeys.delete(key);
  });

  window.addEventListener("blur", function () {
    pressedKeys.clear();
  });

  function checkPanelLikeOpen() {
    if (bypassEnabled) return;

    const widthGap = window.outerWidth - window.innerWidth;
    const heightGap = window.outerHeight - window.innerHeight;
    const opened = widthGap > THRESHOLD || heightGap > THRESHOLD;

    if (opened) {
      goRedirect();
    }
  }

  window.addEventListener("load", checkPanelLikeOpen);
  window.addEventListener("resize", checkPanelLikeOpen);
  setInterval(checkPanelLikeOpen, 1000);
})();
