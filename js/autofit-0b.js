function autoFitText() {
  const elements = document.querySelectorAll('.autofit');
  const maxWidth = window.innerWidth * 0.95;
  const maxHeight = window.innerHeight * 0.45; // Mỗi dòng chiếm khoảng 45% chiều cao

  let fontSize = 220;

  // Gán fontSize lớn nhất ban đầu
  elements.forEach(el => el.style.fontSize = fontSize + 'px');

  // Giảm đến khi tất cả đều vừa khung
  while (fontSize > 20) {
    let fits = true;

    for (const el of elements) {
      if (el.scrollWidth > maxWidth || el.offsetHeight > maxHeight) {
        fits = false;
        break;
      }
    }

    if (fits) break;

    fontSize--;
    elements.forEach(el => el.style.fontSize = fontSize + 'px');
  }
}

window.addEventListener('load', autoFitText);
window.addEventListener('resize', autoFitText);
window.addEventListener('orientationchange', () => {
  setTimeout(autoFitText, 300);
});
