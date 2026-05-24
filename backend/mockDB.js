const crypto = require("crypto");

const users = []
const wallets = []
const transactions = []

let nextAccountNumber = 1075102639;

function generateNextAccountNumber() {
  const current = nextAccountNumber;
  nextAccountNumber += 1;
  return current.toString();
}

module.exports = {
    findUserByEmail: (email)=>{
        return users.find(u=>u.email===email) || null
    },
    findUserByAccNumber: (accountNumber)=>{
        return users.find(u=>u.accountNumber===accountNumber) || null
    },
    generateNextAccountNumber
    ,
    createUser: (userObject)=>{
        users.push(userObject)
        return userObject
    },
    findWalletByUserId: (userId) => {
        return wallets.find(w => w.user_id === userId) || null;
    },
    createWallet: (walletObject) => {
        wallets.push(walletObject);
        return walletObject;
    },
        executeTransfer: (senderId, receiverId, amountInCents) => {
        const senderWallet = wallets.find(w => w.user_id === senderId);
        const receiverWallet = wallets.find(w => w.user_id === receiverId);
        
        if (!senderWallet || !receiverWallet) throw new Error("Wallet not found");
        if (senderWallet.balance < amountInCents) throw new Error("Insufficient funds");
        
        senderWallet.balance -= amountInCents;
        receiverWallet.balance += amountInCents;
        

        // new transaction object
        const txn = {
            id: crypto.randomUUID(),
            sender_id: senderId,
            receiver_id: receiverId,
            amount: amountInCents,
            timestamp: new Date()
        };
        transactions.push(txn);
        return txn;
    }

}