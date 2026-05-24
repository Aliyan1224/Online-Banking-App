import { apiBase } from "../utils/frontendUtils.js";

let isAuthenticating = false;
const registerForm = document.getElementById("register-form");
const nameInput = document.getElementById("register-name");
const emailInput = document.getElementById("register-email");
const passwordInput = document.getElementById("register-password");
const registerSubmit = document.getElementById("register-submit");
const errorDisplay = document.getElementById("error-message");

registerForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const name = nameInput.value;
  const email = emailInput.value;
  const password = passwordInput.value;

  if (isAuthenticating || !name || !email || !password) {
    return;
  }

  isAuthenticating = true;
  registerSubmit.textContent = "Authenticating...";
  registerSubmit.disabled = true;
  errorDisplay.style.display = "none";

  try {
    let data;
    const response = await fetch(apiBase + "auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    data = await response.json();

    if (!response.ok) {
      errorDisplay.style.display = "block";
      errorDisplay.textContent = data.error.message;
      throw new Error(data.error || "Invalid credentials.");
    }

    if (data.success || data.token) {
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    errorDisplay.style.display = "block";
    errorDisplay.textContent = error.message;
  } finally {
    isAuthenticating = false;
    registerSubmit.textContent = "Register";
    registerSubmit.disabled = false;
  }
});
