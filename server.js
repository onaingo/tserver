const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const alchemyUrl = process.env.ALCHEMY_URL;

// Enable CORS for all routes
app.use(cors());

// WebSocket connection to Alchemy
const provider = new ethers.providers.WebSocketProvider(alchemyUrl);

// Store the latest ETH price
let latestEthPrice = null;

// Subscribe to the Alchemy WebSocket for real-time ETH price updates
provider.on('block', async (blockNumber) => {
    try {
        const ethPrice = await provider.getEtherPrice();
        latestEthPrice = ethPrice;
        console.log(`New ETH price: ${ethPrice} USD`);
    } catch (error) {
        console.error('Error fetching ETH price:', error);
    }
});

app.get('/', (req, res) => {
    res.send('Server is running. Go to /ethprice to see the ETH price.');
});

app.get('/ethprice', async (req, res) => {
    if (latestEthPrice) {
        res.json({ price: parseFloat(latestEthPrice) });
    } else {
        res.status(500).json({ error: 'ETH price not available' });
    }
});

app.get('/fnftdata', async (req, res) => {
    try {
        const metadataList = await loadContractData();
        res.json(metadataList);
    } catch (error) {
        console.error('Error fetching F-NFT data:', error);
        res.status(500).json({ error: 'Failed to fetch F-NFT data' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
