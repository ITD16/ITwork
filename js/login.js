const form = document.getElementById("loginForm");
const errBox = document.getElementById("loginError");

function detectOS() {
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";

  if (/iPhone|iPad|iPod/i.test(ua)) return "iPhone/iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Mac/i.test(platform) || /Macintosh/i.test(ua)) return "Mac";
  if (/Win/i.test(platform) || /Windows/i.test(ua)) return "Windows";
  if (/Linux/i.test(platform) || /Linux/i.test(ua)) return "Linux";
  return "Unknown OS";
}

function detectBrowser() {
  const ua = navigator.userAgent || "";

  if (/Edg\//i.test(ua)) return "Edge";
  if (/OPR\//i.test(ua) || /Opera/i.test(ua)) return "Opera";
  if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
  if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  if (/Firefox\//i.test(ua)) return "Firefox";
  return "Unknown Browser";
}

function getDeviceInfo() {
  return `${detectOS()} / ${detectBrowser()}`;
}

form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  errBox.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;
  const deviceInfo = getDeviceInfo();

  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, deviceInfo }),
      credentials: "include"
    });

    const data = await res.json();
    if (!res.ok) {
      errBox.textContent = data.error || "Login failed";
      return;
    }

    window.location.href = "/admin.html";
  } catch (err) {
    errBox.textContent = err.message || "Network error";
  }
});
