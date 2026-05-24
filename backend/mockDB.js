import crypto from "crypto";

const users = [];
const wallets = [];
const transactions = [];

let nextAccountNumber = 1075102639;

export function generateNextAccountNumber() {
  const current = nextAccountNumber;
  nextAccountNumber += 1;
  return current.toString();
}

export const findUserByEmail = (email) => {
  return users.find(u => u.email === email) || null;
};

export const findUserByAccNumber = (accountNumber) => {
  return users.find(u => u.accountNumber === accountNumber) || null;
};

export const createUser = (userObject) => {
  users.push(userObject);
  return userObject;
};

export const findWalletByUserId = (userId) => {
  return wallets.find(w => w.user_id === userId) || null;
};

export const createWallet = (walletObject) => {
  wallets.push(walletObject);
  return walletObject;
};

export const executeTransfer = (senderId, receiverId, amountInCents) => {
  const senderWallet = wallets.find(w => w.user_id === senderId);
  const receiverWallet = wallets.find(w => w.user_id === receiverId);
  
  if (!senderWallet || !receiverWallet) throw new Error("Wallet not found");
  if (senderWallet.balance < amountInCents) throw new Error("Insufficient funds");
  
  senderWallet.balance -= amountInCents;
  receiverWallet.balance += amountInCents;
  
  // New transaction object
  const txn = {
    id: crypto.randomUUID(),
    sender_id: senderId,
    receiver_id: receiverId,
    amount: amountInCents,
    timestamp: new Date()
  };
  
  transactions.push(txn);
  return txn;
};