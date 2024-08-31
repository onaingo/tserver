const { ethers } = require('ethers');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

// Load the ABI from the tokenLogicABI.json file
const tokenLogicAbi = JSON.parse(fs.readFileSync('./scripts/tokenLogicABI.json', 'utf8'));
const nftContractAbi = JSON.parse(fs.readFileSync('./scripts/nftContractABI.json', 'utf8'));

// Mint event topic
const MINT_EVENT_TOPIC = '0xf9c32fbc56ff04f32a233ebc26e388564223745e28abd8d0781dd906537f563e';

async function fetchVaultId(contractAddress) {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
        const logs = await provider.getLogs({
            fromBlock: '0x0',
            toBlock: 'latest',
            address: contractAddress,
            topics: [MINT_EVENT_TOPIC]
        });

        if (logs.length === 0) {
            console.log(`No Mint event found for contract: ${contractAddress}`);
            return null;
        }

        // Assume the first log is the creation event (this may need adjustment based on contract behavior)
        const log = logs[0];
        const decodedLog = ethers.utils.defaultAbiCoder.decode(
            ['address', 'uint256', 'uint256', 'address', 'uint256'],
            log.data
        );
        const vaultId = decodedLog[4].toString(); // vaultId is the 5th element in the log data

        return vaultId;
    } catch (error) {
        console.error(`Error fetching vaultId for contract ${contractAddress}:`, error);
        return null;
    }
}

async function fetchFNFTMetadata(contractAddress) {
    const provider = new ethers.JsonRpcProvider(process.env.ALCHEMY_URL);
    const tokenContract = new ethers.Contract(contractAddress, tokenLogicAbi, provider);

    try {
        const tokenId = await tokenContract.id();
        const nftContractAddress = await tokenContract.token();
        const name = await tokenContract.name();
        const symbol = await tokenContract.symbol();

        // Interact with the NFT contract to get the contractURI
        const nftContract = new ethers.Contract(nftContractAddress, nftContractAbi, provider);
        let ipfsUrl = 'Not available';

        try {
            const contractUri = await nftContract.contractURI();
            const metadataResponse = await axios.get(contractUri);
            ipfsUrl = metadataResponse.data.image || 'Not available';
        } catch (err) {
            console.error('Error fetching IPFS URL:', err);
        }

        const vaultId = await fetchVaultId(contractAddress);

        const localImage = `./src/images/${symbol}.webp`;
        const localVideo = `./src/NFT-videos/${symbol}.mp4`;

        return {
            id: tokenId.toString(),
            name,
            symbol,
            tokenContractAddress: contractAddress,
            nftContractAddress,
            ipfsUrl,
            localImage,
            localVideo,
            vaultId,
        };
    } catch (error) {
        console.error('Error fetching F-NFT metadata:', error);
        return null;
    }
}

// Example function to iterate through a list of contract addresses and fetch their metadata
async function loadContractData() {
    const filePath = './fnftContracts.txt';
    const contractAddresses = fs.readFileSync(filePath, 'utf8')
        .split('\n')
        .map(line => line.trim())
        .filter(line => line !== '');

    const metadataArray = [];
    for (const address of contractAddresses) {
        const metadata = await fetchFNFTMetadata(address);
        if (metadata) {
            metadataArray.push(metadata);
        }
    }
    return metadataArray;
}

module.exports = fetchFNFTMetadata;
