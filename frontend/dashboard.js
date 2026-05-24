import { apiBase } from "../utils/frontendUtils.js";

const nameDisplay = document.getElementById('dashboard-user-name')
const balanceDisplay = document.getElementById('dashboard-user-balance')

async function fetchUserProfile() {
    console.log('dashboard loaded!')
  try {
    const response = await fetch(apiBase + "auth/profile", {
      method: "GET",
      credentials: "include" 
    });

    const data = await response.json();

    if (!response.ok) {
      alert("401: Unautorized... Please login first!");
    }

    if (data.success && data.user) {
      console.log("haan hogaya")
      nameDisplay.textContent = data.user.name;
      balanceDisplay.textContent = data.wallet ? data.wallet.balance : null;
    }

  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

// as soon as the page loads runing the fetch fun
document.addEventListener("DOMContentLoaded", fetchUserProfile);