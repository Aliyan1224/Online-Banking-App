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

export const findWalletById = (walletId) => {
  return wallets.find(w => w.id === walletId) || null;
};

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

export function recordTransaction(transaction) {
  transactions.push(transaction); 
}
export const getUserTransactions = (userId) => {
  // 1. Filter: Include transfers (sender/receiver) OR single-party (userId)
  const userTxns = transactions.filter(
    t => t.sender_id === userId || t.receiver_id === userId || t.userId === userId
  );

  return userTxns.map(txn => {
    // 2. Check if it is a Deposit/Withdrawal (uses 'userId')
    if (txn.userId === userId) {
      return {
        id: txn.id,
        type: txn.type, // "Deposit" or "Withdrawal"
        amount: txn.amount,
        timestamp: txn.timestamp
      };
    } 
    
    // 3. Otherwise, handle it as a Transfer (Sent/Received)
    const isSender = txn.sender_id === userId;
    const otherUserId = isSender ? txn.receiver_id : txn.sender_id;
    const otherUser = users.find(u => u.id === otherUserId) || {};

    return {
      id: txn.id,
      type: isSender ? 'Sent' : 'Received',
      amount: txn.amount,
      timestamp: txn.timestamp,
      otherParty: {
        name: otherUser.name || 'Unknown User',
        email: otherUser.email || 'Unknown Email'
      }
    };
  }).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); 
};