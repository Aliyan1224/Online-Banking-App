// dataRepository.js - In-Memory Mock Database
const users = [];       // Holds mock user objects
const wallets = [];     // Holds wallet objects
const transactions = []; // Holds transaction logs

module.exports = {
    // --- USER METHODS ---
    findUserByEmail: async (email) => {
        return users.find(u => u.email === email) || null;
    },
    createUser: async (userObject) => {
        users.push(userObject);
        return userObject;
    },

    // --- WALLET METHODS ---
    getWalletByUserId: async (userId) => {
        return wallets.find(w => w.user_id === userId) || null;
    },
    createWallet: async (walletObject) => {
        wallets.push(walletObject);
        return walletObject;
    },
    
    // --- ATOMIC TRANSFER METHOD ---
    executeTransfer: async (senderId, receiverId, amountInCents) => {
        const senderWallet = wallets.find(w => w.user_id === senderId);
        const receiverWallet = wallets.find(w => w.user_id === receiverId);
        
        if (!senderWallet || !receiverWallet) throw new Error("Wallet not found");
        if (senderWallet.balance < amountInCents) throw new Error("Insufficient funds");
        
        // Purely algebraic mathematical mutation
        senderWallet.balance -= amountInCents;
        receiverWallet.balance += amountInCents;
        
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
};