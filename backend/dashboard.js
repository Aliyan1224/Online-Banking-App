const apiBase = "http://localhost:6767/";

const nameDisplay = document.getElementById('dashboard-user-name')
const balanceDisplay = document.getElementById('dashboard-user-balance')

async function fetchUserProfile() {
  try {
    const response = await fetch(apiBase + "auth/profile", {
      method: "GET",
      credentials: "include" 
    });

    const data = await response.json();

    if (!response.ok) {
      alert("401: Unautorized... Please login first!");
      window.location.href = "/login.html";
      return;
    }

    if (data.success && data.user) {
      nameDisplay.textContent = data.user.name;
      balanceDisplay.textContent = data.wallet.balance;
    }

  } catch (error) {
    console.error("Error loading dashboard:", error);
    window.location.href = "/login.html";
  }
}

// as soon as the page loads runing the fetch fun
document.addEventListener("DOMContentLoaded", fetchUserProfile);