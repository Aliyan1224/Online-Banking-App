import { apiBase } from "../utils/frontendUtils.js";

const nameDisplay = document.getElementById('dashboard-user-name')
const balanceDisplay = document.getElementById('dashboard-user-balance')
const accountInfoBtn = document.getElementById('dash-account-info')
const accountInfoCard = document.getElementById('account-info-card')

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
      window.location.href = "login.html";
      return;
    }

    if (data.success && data.user) {
      console.log("haan hogaya")
      nameDisplay.textContent = data.user.name;
      balanceDisplay.textContent = data.wallet ? data.wallet.balance : null;
      document.getElementById('info-name').innerText = data.user.name
      document.getElementById('info-account-number').innerText = data.user.accountNumber
      document.getElementById('info-email').innerText = data.user.email
      document.getElementById('info-wallet-id').innerText = data.wallet.id
      document.getElementById('info-balance').innerText = `${data.wallet.currency} ${data.wallet.balance}`
      document.getElementById('info-date').innerText = new Date(data.user.dateCreated)
    }

  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

// as soon as the page loads runing the fetch fun
document.addEventListener("DOMContentLoaded", fetchUserProfile);

accountInfoBtn.addEventListener('click', ()=>{
    accountInfoCard.style.display = "block";
})

document.getElementById("close-account-info").addEventListener("click", () => {
    accountInfoCard.style.display = "none";
});

document.getElementById("deposit-action-button").addEventListener("click", () => {
    document.getElementById('deposit-card').style.display = "block";
});

document.getElementById("close-deposit-card").addEventListener("click", () => {
    document.getElementById('deposit-card').style.display = "none";
});


document.getElementById("withdraw-action-button").addEventListener("click", () => {
    document.getElementById('withdraw-card').style.display = "block";
});

document.getElementById("close-withdraw-card").addEventListener("click", () => {
    document.getElementById('withdraw-card').style.display = "none";
});
