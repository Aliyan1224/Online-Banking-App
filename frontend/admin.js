
const loginBtn = document.getElementById("admin-login-btn");
const passwordInput = document.getElementById("admin-password-input");
const errorMsg = document.getElementById("error-message");

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = "block";
}

async function handleAdminLogin() {
  const password = passwordInput.value.trim();
  if (!password) {
    showError("Please enter the admin password.");
    return;
  }

  loginBtn.textContent = "Logging in...";
  loginBtn.disabled = true;
  errorMsg.style.display = "none";

  try {
    const res = await fetch("/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    const data = await res.json();

    if (res.ok && data.success) {
      window.location.href = "/adminDashboard.html";
    } else {
      showError(data.error || "Login failed.");
    }
  } catch (err) {
    showError("Could not connect to server.");
  } finally {
    loginBtn.textContent = "Login";
    loginBtn.disabled = false;
  }
}

loginBtn.addEventListener("click", handleAdminLogin);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") handleAdminLogin();
});