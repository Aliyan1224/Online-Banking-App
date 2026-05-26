// frontend/adminDashboard.js

let allUsers = [];
let pendingDeleteId = null;


const tableBody        = document.getElementById("users-table-body");
const searchInput      = document.getElementById("admin-search");
const overlay          = document.getElementById("modal-overlay");

const userInfoModal    = document.getElementById("user-info-modal");
const txnModal         = document.getElementById("txn-modal");
const deleteModal      = document.getElementById("delete-modal");


function formatCurrency(amount, currency = "PKR") {
  return `${currency} ${Number(amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}`;
}

function formatDate(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString("en-PK", {
    year: "numeric", month: "short", day: "numeric"
  });
}

function openModal(modal) {
  overlay.classList.add("active");
  modal.classList.add("active");
}

function closeAllModals() {
  overlay.classList.remove("active");
  [userInfoModal, txnModal, deleteModal].forEach(m => m.classList.remove("active"));
  pendingDeleteId = null;
}

overlay.addEventListener("click", closeAllModals);
document.getElementById("close-user-info").addEventListener("click", closeAllModals);
document.getElementById("close-txn-modal").addEventListener("click", closeAllModals);
document.getElementById("close-delete-modal").addEventListener("click", closeAllModals);
document.getElementById("cancel-delete-btn").addEventListener("click", closeAllModals);


function renderTable(users) {
  if (!users.length) {
    tableBody.innerHTML = `<tr><td colspan="7" class="state-msg">No users found.</td></tr>`;
    return;
  }

  tableBody.innerHTML = users.map(u => {
    const frozen = u.isFrozen;
    const badge = frozen
      ? `<span class="badge badge-frozen">Frozen</span>`
      : `<span class="badge badge-active">Active</span>`;

    const freezeBtn = frozen
      ? `<button class="action-btn btn-unfreeze" data-action="unfreeze" data-id="${u.id}">Unfreeze</button>`
      : `<button class="action-btn btn-freeze"   data-action="freeze"   data-id="${u.id}">Freeze</button>`;

    return `
      <tr>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td style="font-family: monospace; letter-spacing: 0.5px;">${u.accountNumber}</td>
        <td>${formatCurrency(u.balance, u.currency)}</td>
        <td>${badge}</td>
        <td>${formatDate(u.dateCreated)}</td>
        <td>
          <button class="action-btn btn-info" data-action="info" data-id="${u.id}">Info</button>
          <button class="action-btn btn-txn"  data-action="txn"  data-id="${u.id}">Txns</button>
          ${freezeBtn}
          <button class="action-btn btn-delete" data-action="delete" data-id="${u.id}" data-name="${u.name}">Delete</button>
        </td>
      </tr>
    `;
  }).join("");
}


function updateStats(users) {
  document.getElementById("stat-total").textContent  = users.length;
  document.getElementById("stat-active").textContent = users.filter(u => !u.isFrozen).length;
  document.getElementById("stat-frozen").textContent = users.filter(u => u.isFrozen).length;
  document.getElementById("admin-last-updated").textContent =
    `Last updated: ${new Date().toLocaleTimeString("en-PK")}`;
}


async function loadUsers() {
  tableBody.innerHTML = `<tr><td colspan="7" class="state-msg">Loading users…</td></tr>`;
  try {
    const res = await fetch("/admin/users", { credentials: "include" });
    if (res.status === 401) {
      window.location.href = "admin.html";
      return;
    }
    const data = await res.json();
    allUsers = data.users || [];
    updateStats(allUsers);
    renderTable(allUsers);
  } catch (err) {
    tableBody.innerHTML = `<tr><td colspan="7" class="state-msg">Failed to load users.</td></tr>`;
  }
}


searchInput.addEventListener("input", () => {
  const q = searchInput.value.toLowerCase();
  const filtered = allUsers.filter(u =>
    u.name.toLowerCase().includes(q) ||
    u.email.toLowerCase().includes(q) ||
    u.accountNumber.includes(q)
  );
  renderTable(filtered);
});


tableBody.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;

  const action = btn.dataset.action;
  const userId = btn.dataset.id;
  const user   = allUsers.find(u => u.id === userId);

  if (action === "info") {
    showUserInfo(user);
  } else if (action === "txn") {
    showUserTxns(user);
  } else if (action === "freeze" || action === "unfreeze") {
    await toggleFreeze(userId, action === "freeze");
  } else if (action === "delete") {
    pendingDeleteId = userId;
    document.getElementById("delete-modal-name").textContent = btn.dataset.name;
    openModal(deleteModal);
  }
});


function showUserInfo(u) {
  document.getElementById("modal-info-name").textContent    = u.name;
  document.getElementById("modal-info-accno").textContent   = u.accountNumber;
  document.getElementById("modal-info-email").textContent   = u.email;
  document.getElementById("modal-info-balance").textContent = formatCurrency(u.balance, u.currency);
  document.getElementById("modal-info-status").innerHTML    = u.isFrozen
    ? `<span class="badge badge-frozen">Frozen</span>`
    : `<span class="badge badge-active">Active</span>`;
  document.getElementById("modal-info-joined").textContent  = formatDate(u.dateCreated);
  openModal(userInfoModal);
}


async function showUserTxns(u) {
  document.getElementById("txn-modal-subtitle").textContent = `${u.name} · ${u.email}`;
  const list = document.getElementById("modal-txn-list");
  list.innerHTML = `<p class="state-msg">Loading…</p>`;
  openModal(txnModal);

  try {
    const res = await fetch(`/admin/users/${u.id}/transactions`, { credentials: "include" });
    const data = await res.json();
    const txns = data.transactions || [];

    if (!txns.length) {
      list.innerHTML = `<p class="state-msg">No transactions found.</p>`;
      return;
    }

    list.innerHTML = txns.map(t => {
      const isSent     = t.type === "Sent";
      const isDeposit  = t.type === "Deposit";
      const typeClass  = isSent ? "sent" : "received";
      const amountCls  = isSent ? "minus" : "plus";
      const sign       = isSent ? "−" : "+";
      const other      = t.otherParty ? `<small>${t.otherParty.name} · ${t.otherParty.email}</small>` : "";
      const ts         = t.timestamp ? new Date(t.timestamp).toLocaleString("en-PK") : "";

      return `
        <div class="txn-item ${typeClass}">
          <div class="txn-info">
            <strong>${t.type}</strong>
            <span>${ts}</span>
            ${other}
          </div>
          <span class="txn-amount ${amountCls}">${sign} PKR ${Number(t.amount).toLocaleString("en-PK", { minimumFractionDigits: 2 })}</span>
        </div>
      `;
    }).join("");
  } catch {
    list.innerHTML = `<p class="state-msg">Failed to load transactions.</p>`;
  }
}


async function toggleFreeze(userId, freeze) {
  try {
    const res = await fetch(`/admin/users/${userId}/freeze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ frozen: freeze }),
    });
    if (res.ok) {
      await loadUsers();
    }
  } catch (err) {
    console.error("Freeze toggle failed", err);
  }
}


document.getElementById("confirm-delete-btn").addEventListener("click", async () => {
  if (!pendingDeleteId) return;
  const btn = document.getElementById("confirm-delete-btn");
  btn.textContent = "Deleting…";
  btn.disabled = true;

  try {
    const res = await fetch(`/admin/users/${pendingDeleteId}/delete`, {
      method: "POST",
      credentials: "include",
    });
    if (res.ok) {
      closeAllModals();
      await loadUsers();
    }
  } catch (err) {
    console.error("Delete failed", err);
  } finally {
    btn.textContent = "Delete";
    btn.disabled = false;
  }
});

loadUsers();