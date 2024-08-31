const { ethers } = require('ethers');
require('dotenv').config();

// Mint event topic for the vaultId
const MINT_EVENT_TOPIC = '0xf9c32fbc56ff04f32a233ebc26e388564223745e28abd8d0781dd906537f563e';

async function fetchVaultId(contractAddress) {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);

        // Fetch logs related to the contract address
        const logs = await provider.getLogs({
            fromBlock: 'earliest',
            toBlock: 'latest',
            address: contractAddress,
            topics: [MINT_EVENT_TOPIC]
        });

        if (logs.length === 0) {
            console.log(`No Mint event found for contract: ${contractAddress}`);
            return null;
        }

        // Decode the first log data to get the vaultId
        const decodedLog = ethers.utils.defaultAbiCoder.decode(
            ['address', 'uint256', 'uint256', 'address', 'uint256'],
            logs[0].data
        );
        const vaultId = decodedLog[4].toString(); // vaultId is the 5th element in the log data

        return vaultId;
    } catch (error) {
        console.error(`Error fetching vaultId for contract ${contractAddress}:`, error);
        return null;
    }
}

module.exports = fetchVaultId;
