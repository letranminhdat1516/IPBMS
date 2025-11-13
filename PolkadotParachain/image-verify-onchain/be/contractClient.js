const { ethers } = require('ethers');
const artifact = require('../artifacts/ImageVerify.json');

function normalizeHash(input) {
  if (!input) throw new Error('hash required');
  // if hex-like
  const maybeHex = String(input).trim();
  const hexOnly = /^0x[0-9a-fA-F]+$/.test(maybeHex) || /^[0-9a-fA-F]+$/.test(maybeHex);
  if (hexOnly) {
    const h = maybeHex.startsWith('0x') ? maybeHex : `0x${maybeHex}`;
    // if short, try to pad? assume user passed correct bytes32 (64 hex chars)
    if (h.length === 66) return h;
    if (h.length === 66) return h;
    // if 0x + fewer than 64 hex chars, left-pad with zeros
    if (h.length < 66) {
      const raw = h.replace(/^0x/, '');
      return '0x' + raw.padStart(64, '0');
    }
    return h;
  }
  // otherwise treat as text and return keccak256 of the utf8 bytes
  return ethers.id(maybeHex);
}

function createContractClient({ providerUrl, contractAddress }) {
  if (!providerUrl) providerUrl = process.env.RPC_URL || 'http://localhost:8545';
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const abi = artifact.abi;

  const resolvedAddress = contractAddress || process.env.CONTRACT_ADDRESS;
  if (!resolvedAddress) {
    console.warn('No contract address provided. Set CONTRACT_ADDRESS in .env or pass it to createContractClient.');
  }

  const contract = new ethers.Contract(resolvedAddress, abi, provider);

  return {
    async verifyImage(hashInput) {
      const hash = normalizeHash(hashInput);
      const res = await contract.verifyImage(hash);
      // returns (bool exists, uint256 timestamp, string creator)
      const exists = Boolean(res[0]);
      const timestamp = res[1] ? res[1].toString() : null;
      const creator = res[2] || '';
      return { exists, timestamp, creator };
    },

    async registerImage(hashInput, creator, privateKey) {
      privateKey = privateKey || process.env.PRIVATE_KEY;
      if (!privateKey) throw new Error('privateKey required to send transactions');
      const wallet = new ethers.Wallet(privateKey, provider);
      const contractWithSigner = contract.connect(wallet);
      const hash = normalizeHash(hashInput);
      const tx = await contractWithSigner.registerImage(hash, creator);
      return tx;
    },

    getContractAddress() {
      return resolvedAddress;
    }
  };
}

module.exports = { createContractClient };
