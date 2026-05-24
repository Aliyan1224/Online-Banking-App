import { apiBase } from "../utils/frontendUtils.js";

let isAuthenticating = false;
const loginForm = document.getElementById("login-form");
const accNumberInput = document.getElementById("login-account-number");
const passwordInput = document.getElementById("login-password");
const loginSubmit = document.getElementById("login-submit");
const errorDisplay = document.getElementById("error-message");

loginForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const accNumberVal = accNumberInput.value;
  const passVal = passwordInput.value;

  if (isAuthenticating || !accNumberVal || !passVal) {
    return;
  }

  isAuthenticating = true;
  loginSubmit.textContent = "Authenticating...";
  loginSubmit.disabled = true;
  errorDisplay.style.display = "none";

  try {
    let data;
    const response = await fetch(apiBase + "auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountNumber: accNumberVal, password: passVal }),
    });
    data = await response.json();

    if (!response.ok) {
      errorDisplay.style.display = "block";
      throw new Error(data.error || "Invalid login credentials.");
    }

    if (data.success || data.token) {
      window.location.href = "dashboard.html";
    }
  } catch (error) {
    errorDisplay.style.display = "block";
    errorDisplay.textContent = error.message;
  } finally {
    isAuthenticating = false;
    loginSubmit.textContent = "Login";
    loginSubmit.disabled = false;
  }
});
