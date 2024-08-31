const { ethers } = require('ethers');
const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

// Load the ABI from the tokenLogicABI.json file
const tokenLogicAbi = JSON.parse(fs.readFileSync('./scripts/tokenLogicABI.json', 'utf8'));
const nftContractAbi = JSON.parse(fs.readFileSync('./scripts/nftContractABI.json', 'utf8'));

async function fetchFNFTMetadata(contractAddress) {
    const provider = new ethers.providers.WebSocketProvider(process.env.ALCHEMY_URL);
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
        };
    } catch (error) {
        console.error('Error fetching F-NFT metadata:', error);
        return null;
    }
}

module.exports = fetchFNFTMetadata;
