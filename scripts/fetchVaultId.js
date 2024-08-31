const axios = require('axios');
require('dotenv').config();

async function getCreationTransaction(contractAddress) {
    try {
        const apiKey = process.env.ETHERSCAN_API_KEY;
        const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${contractAddress}&startblock=0&endblock=99999999&sort=asc&apikey=${apiKey}`;

        // Fetch the transaction list for the contract address
        const response = await axios.get(url);
        const transactions = response.data.result;

        // Find the transaction where the contract was created (where `to` is null)
        const creationTx = transactions.find(tx => tx.to === null || tx.to === '');

        if (!creationTx) {
            console.error(`No creation transaction found for contract: ${contractAddress}`);
            return null;
        }

        return creationTx.hash;
    } catch (error) {
        console.error(`Error fetching creation transaction for contract ${contractAddress}:`, error);
        return null;
    }
}

module.exports = getCreationTransaction;
