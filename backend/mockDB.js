const users = []
const wallets = []
const transactions = []

module.exports = {
    findUserByEmail: async (email)=>{
        return users.find(u=>u.email===email) || null
    },
    findUserByAccNumber: async (accountNumber)=>{
        return users.find(u=>u.accountNumber===accountNumber) || null
    },
    createUser: async (userObject)=>{
        users.push(userObject)
        return userObject
    },
    getWalletByUserId: async (userId) => {
        return wallets.find(w => w.user_id === userId) || null;
    },
    createWallet: async (walletObject) => {
        wallets.push(walletObject);
        return walletObject;
    },
        executeTransfer: async (senderId, receiverId, amountInCents) => {
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