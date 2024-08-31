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
const alchemyApiKey = process.env.ALCHEMY_API_KEY;
const alchemyUrl = process.env.ALCHEMY_URL;

// Initialize Alchemy provider for the Sepolia testnet
const provider = new ethers.AlchemyProvider('sepolia', alchemyApiKey);

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

// Function to get the contract creation transaction hash from Etherscan
async function getContractCreationTx(contractAddress) {
    try {
        const url = `https://api-sepolia.etherscan.io/api?module=contract&action=getcontractcreation&contractaddresses=${contractAddress}&apikey=${apiKey}`;

        const response = await axios.get(url);
        const data = response.data;

        if (data.status === '1' && data.result.length > 0) {
            const creationTx = data.result[0].txHash;
            return creationTx;
        } else {
            throw new Error('No transactions found or invalid response from Etherscan.');
        }
    } catch (error) {
        console.error('Error fetching contract creation transaction:', error.message);
    }
}

// Function to fetch and decode the Mint event from the transaction receipt
async function fetchAndDecodeMintEvent(txHash) {
    try {
        const receipt = await provider.getTransactionReceipt(txHash);
        const mintTopic = '0xf9c32fbc56ff04f32a233ebc26e388564223745e28abd8d0781dd906537f563e';
        const abiCoder = new ethers.AbiCoder(); 

        for (const log of receipt.logs) {
            if (log.topics[0] === mintTopic) {
                const decodedData = abiCoder.decode(
                    ['uint256', 'uint256', 'address', 'uint256'], 
                    log.data
                );

                const nftId = decodedData[0].toString();
                const price = decodedData[1].toString();
                const vaultAddress = decodedData[2];
                const vaultId = decodedData[3].toString();

                return { nftId, price, vaultAddress, vaultId };
            }
        }

        throw new Error('Mint event not found in the logs.');
    } catch (error) {
        console.error('Error fetching and decoding Mint event logs:', error.message);
    }
}

// Extend the function to fetch metadata and include Vault ID
async function fetchFNFTMetadata(seqid, contractAddress) {
    const provider = new ethers.JsonRpcProvider(alchemyUrl);
    const contract = new ethers.Contract(contractAddress, abi, provider);

    try {
        const nftContractAddress = await contract.token();
        const name = await contract.name();
        const symbol = await contract.symbol();

        const nftContract = new ethers.Contract(nftContractAddress, nftAbi, provider);
        const contractUri = await nftContract.contractURI();

        const metadataResponse = await axios.get(contractUri);
        const ipfsUrl = metadataResponse.data.image;

        // Get the creation transaction hash and decode mint event
        const creationTx = await getContractCreationTx(contractAddress);
        const decodedMintData = creationTx ? await fetchAndDecodeMintEvent(creationTx) : null;

        return {
            seqid,
            name,
            symbol,
            nftContractAddress,
            ipfsUrl,
            localImage: `./src/images/${symbol}.webp`,
            localVideo: `./src/NFT-videos/${symbol}.mp4`,
            ...decodedMintData,  // Spread operator to include decoded data
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

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
