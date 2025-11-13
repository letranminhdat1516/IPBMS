import { ethers } from "ethers";
import artifact from "../abi/ImageVerify.json";
import { env } from "cloudflare:workers";

function normalizeHash(input: string) {
  if (!input) throw new Error("hash required");
  const maybeHex = String(input).trim();
  const hexOnly = /^0x[0-9a-fA-F]+$/.test(maybeHex) || /^[0-9a-fA-F]+$/.test(maybeHex);
  if (hexOnly) {
    const h = maybeHex.startsWith("0x") ? maybeHex : `0x${maybeHex}`;
    if (h.length < 66) {
      const raw = h.replace(/^0x/, "");
      return "0x" + raw.padStart(64, "0");
    }
    return h;
  }
  return ethers.id(maybeHex);
}

export function createContract({ providerUrl, contractAddress }: { providerUrl?: string; contractAddress?: string }) {
  if (!providerUrl) providerUrl = env.RPC_URL || undefined;
  const provider = new ethers.JsonRpcProvider(providerUrl);
  const abi = artifact as any[];
  const resolvedAddress = contractAddress || env.CONTRACT_ADDRESS;
  const contract = new ethers.Contract(resolvedAddress, abi, provider);

  return {
    async verifyImage(hashInput: string) {
      const hash = normalizeHash(hashInput);
      const res = await contract.verifyImage(hash);
      const exists = Boolean(res[0]);
      const timestamp = res[1] ? res[1].toString() : null;
      const creator = res[2] || "";
      return { exists, timestamp, creator };
    },

    async registerImage(hashInput: string, creator: string, privateKey?: string) {
      privateKey = privateKey || env.PRIVATE_KEY;            
      if (!privateKey) throw new Error("privateKey required to send transactions");
      const wallet = new ethers.Wallet(privateKey, provider);
      const contractWithSigner = contract.connect(wallet);
      const hash = normalizeHash(hashInput);
      const res = await contract.verifyImage(hash);
      const exists = Boolean(res[0]);
      if (exists) throw new Error("Image hash already registered");
      const tx = await contractWithSigner.registerImage(hash, creator);
      return tx;
    },

    getContractAddress() {
      return resolvedAddress;
    },
  };
}

export default createContract;
