// autofit-2.js
// Fit riêng cho 2 nhóm:
// - Domain (chủ đạo): #domain1, #domain2  => font lớn nhất có thể
// - Hint: .vpn-hint                      => font nhỏ hơn (giới hạn riêng)

(function () {
  function fitGroup(selectors, options = {}) {
    const els = Array.from(document.querySelectorAll(selectors)).filter(Boolean);
    if (!els.length) return;

    const {
      maxWidthRatio = 0.95,
      maxHeightRatio = 0.45,
      start = 220,
      min = 18,
      step = 1,
    } = options;

    const maxWidth = window.innerWidth * maxWidthRatio;
    const maxHeight = window.innerHeight * maxHeightRatio;

    let fontSize = start;
    els.forEach(el => (el.style.fontSize = fontSize + "px"));

    while (fontSize > min) {
      let fits = true;

      for (const el of els) {
        // scrollWidth xử lý nowrap, offsetHeight xử lý chiều cao thật
        if (el.scrollWidth > maxWidth || el.offsetHeight > maxHeight) {
          fits = false;
          break;
        }
      }

      if (fits) break;

      fontSize -= step;
      els.forEach(el => (el.style.fontSize = fontSize + "px"));
    }
  }

function autoFit2() {
  // 1) Fit DOMAIN: ưu tiên lớn nhất có thể
  fitGroup("#domain1, #domain2", {
    maxWidthRatio: 0.95,
    maxHeightRatio: 0.50,
    start: 320,
    min: 24,
    step: 1,
  });

  // 2) Dòng đầu: lấy theo % size domain (to hơn hiện tại)
  const hint = document.querySelector(".vpn-hint");
  const d1 = document.querySelector("#domain1");
  if (!hint || !d1) return;

  const domainSize = parseFloat(getComputedStyle(d1).fontSize) || 120;

  // ✅ CHỈNH TỈ LỆ Ở ĐÂY:
  // 0.32 = 32% size domain; tăng lên 0.36 / 0.40 nếu muốn dòng đầu to hơn nữa
  let hintSize = Math.round(domainSize * 0.34);

  // Giới hạn để không quá bé / quá khổng lồ
  hintSize = Math.max(22, Math.min(hintSize, 90));

  hint.style.fontSize = hintSize + "px";

  // 3) Nếu dòng đầu bị tràn ngang => giảm dần đến khi vừa
  const maxWidth = window.innerWidth * 0.95;
  while (hintSize > 18 && hint.scrollWidth > maxWidth) {
    hintSize--;
    hint.style.fontSize = hintSize + "px";
  }
}

  window.addEventListener("load", autoFit2);
  window.addEventListener("resize", autoFit2);
  window.addEventListener("orientationchange", () => setTimeout(autoFit2, 300));

  // Cho bạn gọi tay sau khi update config
  window.autoFitText2 = autoFit2;
})();
