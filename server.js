const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { ethers } = require('ethers');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;
const apiKey = process.env.ETHERSCAN_API_KEY;
const alchemyUrl = process.env.ALCHEMY_URL;

// Enable CORS for all routes
app.use(cors());

// Load the ABI from the tokenLogicABI.json file
const abi = JSON.parse(fs.readFileSync('./scripts/tokenLogicABI.json', 'utf8'));
const nftAbi = JSON.parse(fs.readFileSync('./scripts/nftContractABI.json', 'utf8'));

// Function to load contract addresses from a text file
function loadContractsFromFile(filePath) {
    const fileContents = fs.readFileSync(path.resolve(filePath), 'utf8');
    const contractAddresses = fileContents.split('\n').map(line => line.trim()).filter(line => line !== '');
    return contractAddresses;
}

// Function to fetch metadata from a contract
async function fetchFNFTMetadata(seqid, contractAddress) {
    const provider = new ethers.JsonRpcProvider(alchemyUrl);
    const contract = new ethers.Contract(contractAddress, abi, provider);

    try {
        const tokenId = await contract.id();
        const nftContractAddress = await contract.token();
        const name = await contract.name();
        const symbol = await contract.symbol();

        const nftContract = new ethers.Contract(nftContractAddress, nftAbi, provider);
        const contractUri = await nftContract.contractURI();

        const metadataResponse = await axios.get(contractUri);
        const ipfsUrl = metadataResponse.data.image;

        const localImage = `./src/images/${symbol}.webp`;
        const localVideo = `./src/NFT-videos/${symbol}.mp4`;

        return {
            seqid,
            id: tokenId.toString(),
            name,
            symbol,
            tokenContractAddress: contractAddress,
            nftContractAddress,
            ipfsUrl,
            localImage,
            localVideo,
        };
    } catch (error) {
        console.error('Error fetching F-NFT metadata:', error);
        return null;
    }
}

// Load contract addresses from the txt file and fetch metadata for each
async function loadContractData() {
    const contractAddresses = loadContractsFromFile('./fnftContracts.txt');
    const metadataArray = [];

    for (let i = 0; i < contractAddresses.length; i++) {
        const address = contractAddresses[i];
        const metadata = await fetchFNFTMetadata(i + 1, address);
        if (metadata) {
            metadataArray.push(metadata);
        }
    }

    return metadataArray;
}

app.get('/', (req, res) => {
    res.send('Server is running. Go to /ethprice to see the ETH price.');
});

app.get('/ethprice', async (req, res) => {
    try {
        const response = await axios.get('https://api.etherscan.io/api', {
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
        console.error('Error fetching ETH price:', error);
        res.status(500).json({ error: 'Failed to fetch ETH price' });
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
