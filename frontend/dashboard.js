import { apiBase } from "../utils/frontendUtils.js";

const nameDisplay = document.getElementById("dashboard-user-name");
const balanceDisplay = document.getElementById("dashboard-user-balance");
const accountInfoBtn = document.getElementById("dash-account-info");
const accountInfoCard = document.getElementById("account-info-card");
let data;
async function fetchUserProfile() {
  console.log("dashboard loaded!");
  try {
    const response = await fetch(apiBase + "auth/profile", {
      method: "GET",
      credentials: "include",
    });

    data = await response.json();

    if (!response.ok) {
      alert("401: Unautorized... Please login first!");
      window.location.href = "login.html";
      return;
    }

    if (data.success && data.user) {
      console.log("haan hogaya");
      nameDisplay.textContent = data.user.name;
      balanceDisplay.textContent = data.wallet
        ? `${data.wallet.currency} ${data.wallet.balance}`
        : null;
      document.getElementById("info-name").innerText = data.user.name;
      document.getElementById("info-account-number").innerText =
        data.user.accountNumber;
      document.getElementById("info-email").innerText = data.user.email;
      document.getElementById("info-wallet-id").innerText = data.wallet.id;
      document.getElementById("info-balance").innerText =
        `${data.wallet.currency} ${data.wallet.balance}`;
      document.getElementById("info-date").innerText = new Date(
        data.user.dateCreated,
      );
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
  }
}

// as soon as the page loads runing the fetch function
document.addEventListener("DOMContentLoaded", fetchUserProfile);

accountInfoBtn.addEventListener("click", () => {
  accountInfoCard.style.display = "block";
});

document.getElementById("close-account-info").addEventListener("click", () => {
  accountInfoCard.style.display = "none";
});

document
  .getElementById("deposit-action-button")
  .addEventListener("click", () => {
    document.getElementById("deposit-card").style.display = "block";
  });

document.getElementById("close-deposit-card").addEventListener("click", () => {
  document.getElementById("deposit-card").style.display = "none";
});

document
  .getElementById("withdraw-action-button")
  .addEventListener("click", () => {
    document.getElementById("withdraw-card").style.display = "block";
  });

document.getElementById("close-withdraw-card").addEventListener("click", () => {
  document.getElementById("withdraw-card").style.display = "none";
});

document.getElementById("withdraw-input").addEventListener("input", (e) => {
  let currentValue = e.target.value ? Math.abs(Number(e.target.value)) : 0;
  if (currentValue > data.wallet.balance) {
    document.getElementById("remaining-balance").innerText = 0;
    document.getElementById("withdraw-submit").disabled = true;
    document
      .getElementById("withdraw-info-interactive")
      .classList.add("warning");
  } else {
    document.getElementById("remaining-balance").innerText =
      data.wallet.balance - currentValue;
    document.getElementById("withdraw-submit").disabled = false;
    document
      .getElementById("withdraw-info-interactive")
      .classList.remove("warning");
  }
});

document
  .getElementById("withdraw-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const withdrawInput = document.getElementById("withdraw-input");
    const amount = Math.abs(Number(withdrawInput.value));
    if (!amount || amount <= 0 || amount > data.wallet.balance) {
      document
        .getElementById("withdraw-info-interactive")
        .classList.add("warning");
      document.getElementById("withdraw-info-interactive").innerText =
        "Invalid Input!";
      return;
    }

    try {
      const response = await fetch(apiBase + "wallet/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount }),
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        data.wallet.balance -= amount;

        document.getElementById("withdraw-card").style.display = "none";
        withdrawInput.value = "";
        alert("Withdrawal successful!");
        fetchUserProfile();
      } else {
        alert(result.message || "Failed to complete withdrawal.");
      }
    } catch (error) {
      console.error("Withdrawal error:", error);
    }
  });

document
  .getElementById("deposit-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const depositInput = document.getElementById("deposit-input");
    const amount = Math.abs(Number(depositInput.value));

    if (!amount || amount <= 0) {
      alert("Please enter a valid deposit amount.");
      return;
    }

    try {
      const response = await fetch(apiBase + "wallet/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount }),
        credentials: "include",
      });

      const result = await response.json();
      if (response.ok) {
        data.wallet.balance += amount;
        document.getElementById("deposit-card").style.display = "none";
        fetchUserProfile();
        depositInput.value = "";
        alert("Deposit successful!");
      } else {
        alert(result.message || "Failed to complete deposit.");
      }
    } catch (error) {
      console.error("Deposit error:", error);
    }
  });

document
  .getElementById("transfer-action-button")
  .addEventListener("click", () => {
    document.getElementById("transfer-card").style.display = "block";
  });

document.getElementById("close-transfer-card").addEventListener("click", () => {
  document.getElementById("transfer-card").style.display = "none";
});

document
  .getElementById("transfer-amount-input")
  .addEventListener("input", (e) => {
    let currentValue = e.target.value ? Math.abs(Number(e.target.value)) : 0;
    if (currentValue > data.wallet.balance) {
      document.getElementById("transfer-remaining-balance").innerText = 0;
      document.getElementById("transfer-submit").disabled = true;
      document
        .getElementById("transfer-info-interactive")
        .classList.add("warning");
    } else {
      document.getElementById("transfer-remaining-balance").innerText =
        data.wallet.balance - currentValue;
      document.getElementById("transfer-submit").disabled = false;
      document
        .getElementById("transfer-info-interactive")
        .classList.remove("warning");
      if (
        document.getElementById("transfer-info-interactive").innerText ===
        "Invalid Input!"
      ) {
        document.getElementById("transfer-info-interactive").innerHTML =
          'Remaining Balance: <span id="transfer-remaining-balance">' +
          (data.wallet.balance - currentValue) +
          "</span>";
      }
    }
  });

// submit transfer logic
document
  .getElementById("transfer-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault();
    const amountInput = document.getElementById("transfer-amount-input");
    const recipientInput = document.getElementById("transfer-recipient-input");

    const amount = Math.abs(Number(amountInput.value));
    const recipient = recipientInput.value.trim();

    if (!amount || amount <= 0 || amount > data.wallet.balance || !recipient) {
      document
        .getElementById("transfer-info-interactive")
        .classList.add("warning");
      document.getElementById("transfer-info-interactive").innerText =
        "Invalid Input!";
      return;
    }

    try {
      const response = await fetch(apiBase + "wallet/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: amount, recipient: recipient }),
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        data.wallet.balance -= amount;

        document.getElementById("transfer-card").style.display = "none";
        alert("Transfer successful!");

        amountInput.value = "";
        recipientInput.value = "";
        document.getElementById("transfer-remaining-balance").innerText = "";

        fetchUserProfile();
      } else {
        alert(result.message || "Failed to complete transfer.");
      }
    } catch (error) {
      console.error("Transfer error:", error);
    }
  });

document
  .getElementById("txn-history-action-button")
  .addEventListener("click", async () => {
    document.getElementById("txn-history-card").style.display = "block";
    await fetchAndRenderTransactions();
  });

document
  .getElementById("close-txn-history-card")
  .addEventListener("click", () => {
    document.getElementById("txn-history-card").style.display = "none";
  });

// fetch and inject txns
async function fetchAndRenderTransactions() {
  const container = document.getElementById("txn-list-container");
  container.innerHTML = "<p>Loading...</p>";

  try {
    const response = await fetch(apiBase + "wallet/transactions", {
      method: "GET",
      credentials: "include",
    });

    const historyData = await response.json();

    if (response.ok && historyData.success) {
      if (historyData.transactions.length === 0) {
        container.innerHTML = "<p>No recent transactions.</p>";
        return;
      }

      // map over the txns and inject html
      container.innerHTML = historyData.transactions
        .map((txn) => {
          const isDeduction = txn.type === "Sent" || txn.type === "Withdrawal";
          const sign = isDeduction ? "-" : "+";
          const colorClass = isDeduction ? "minus" : "plus";
          const borderClass = isDeduction ? "sent" : "received";
          const dateString = new Date(txn.timestamp).toLocaleString();

          let titleText = "";
          let subText = "";

          if (txn.type === "Sent") {
            titleText = `Transfer to ${txn.otherParty?.name || "Unknown"}`;
            subText = txn.otherParty?.email || "";
          } else if (txn.type === "Received") {
            titleText = `Transfer from ${txn.otherParty?.name || "Unknown"}`;
            subText = txn.otherParty?.email || "";
          } else {
            // For Deposits and Withdrawals
            titleText = `Account ${txn.type}`;
            subText = "System / Self";
          }

          return `
                    <div class="txn-item ${borderClass}">
                        <div class="txn-info">
                            <strong>${titleText}</strong>
                            <span>${subText}</span>
                            <small>${dateString}</small>
                        </div>
                        <div class="txn-amount ${colorClass}">
                            ${sign}${data.wallet.currency} ${txn.amount}
                        </div>
                    </div>
                `;
        })
        .join("");
    } else {
      container.innerHTML = `<p>${historyData.error || "Failed to load history."}</p>`;
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
    container.innerHTML = "<p>Error loading transactions.</p>";
  }
}
