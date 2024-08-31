const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const fetchFNFTMetadata = require('./scripts/FetchMetadata');  // Import the fetchFNFTMetadata function
const fetchVaultId = require('./scripts/fetchVaultId');  // Import the fetchVaultId function
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const apiKey = process.env.ETHERSCAN_API_KEY;
const alchemyUrl = process.env.ALCHEMY_URL;

// Enable CORS for all routes
app.use(cors());

// Function to load contract addresses from a text file
function loadContractsFromFile(filePath) {
    const fileContents = fs.readFileSync(path.resolve(filePath), 'utf8');
    const contractAddresses = fileContents.split('\n').map(line => line.trim()).filter(line => line !== '');
    return contractAddresses;
}

// Custom retry function
async function fetchWithRetry(url, options, retries = 3, delay = 1000) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios.get(url, options);
            return response;
        } catch (error) {
            console.error(`Attempt ${i + 1} failed: ${error.message}`);
            if (i < retries - 1) {
                await new Promise(res => setTimeout(res, delay));
            } else {
                throw error; // If all retries fail, throw the error
            }
        }
    }
}

// Load contract addresses from the txt file and fetch metadata for each
async function loadContractData() {
    const contractAddresses = loadContractsFromFile('./fnftContracts.txt');
    const metadataArray = [];

    for (let i = 0; i < contractAddresses.length; i++) {
        const address = contractAddresses[i];
        const metadata = await fetchFNFTMetadata(address);  // Use the imported function
        if (metadata) {
            metadataArray.push({ seqid: i + 1, ...metadata });  // Add seqid to the metadata
        }
    }

    return metadataArray;
}

app.get('/', (req, res) => {
    res.send('Server is running. Go to /ethprice to see the ETH price.');
});

app.get('/ethprice', async (req, res) => {
    try {
        const response = await fetchWithRetry('https://api.etherscan.io/api', {
            params: {
                module: 'stats',
                action: 'ethprice',
                apikey: apiKey,
            },
        });

        if (response.data.status === '1') {
            const ethPrice = response.data.result.ethusd;
            res.json({ price: parseFloat(ethPrice) });
        } else {
            console.error('Error fetching ETH price:', response.data.message);
            res.status(500).json({ error: 'Failed to fetch ETH price' });
        }
    } catch (error) {
        console.error('Error fetching ETH price after retries:', error.message);
        res.status(500).json({ error: 'Failed to fetch ETH price after retries' });
    }
});

app.get('/fnftdata', async (req, res) => {
    try {
        const metadataList = await loadContractData();
        res.json(metadataList);
    } catch (error) {
        console.error('Error fetching F-NFT data:', error.message);
        res.status(500).json({ error: 'Failed to fetch F-NFT data' });
    }
});

// New endpoint to fetch the vaultId for a given contract address
app.get('/vaultid', async (req, res) => {
    const contractAddresses = loadContractsFromFile('./fnftContracts.txt');

    const results = [];

    for (const address of contractAddresses) {
        try {
            const vaultId = await fetchVaultId(address);
            results.push({ address, vaultId });
        } catch (error) {
            results.push({ address, error: 'Failed to fetch vault ID' });
        }
    }

    res.json(results);
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
