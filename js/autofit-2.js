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
    // 1) Domain: ưu tiên lớn (chủ đạo)
    fitGroup("#domain1, #domain2", {
      maxWidthRatio: 0.95,
      maxHeightRatio: 0.50, // mỗi dòng domain được phép cao hơn chút
      start: 260,           // cho phép thử to hơn 220
      min: 24,
      step: 1,
    });

    // 2) Hint: nhỏ hơn domain, không kéo domain xuống
    fitGroup(".vpn-hint", {
      maxWidthRatio: 0.95,
      maxHeightRatio: 0.12, // chỉ chiếm ít chiều cao
      start: 90,
      min: 18,
      step: 1,
    });
  }

  window.addEventListener("load", autoFit2);
  window.addEventListener("resize", autoFit2);
  window.addEventListener("orientationchange", () => setTimeout(autoFit2, 300));

  // Cho bạn gọi tay sau khi update config
  window.autoFitText2 = autoFit2;
})();
