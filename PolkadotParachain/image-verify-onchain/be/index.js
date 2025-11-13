const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { createContractClient } = require('./contractClient');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

const client = createContractClient({
  providerUrl: process.env.RPC_URL,
  contractAddress: process.env.CONTRACT_ADDRESS
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/verify/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    const result = await client.verifyImage(hash);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /register { hash, creator, privateKey? }
app.post('/register', async (req, res) => {
  try {
    const { hash, creator, privateKey } = req.body;
    if (!hash || !creator) return res.status(400).json({ error: 'hash and creator are required' });
    const tx = await client.registerImage(hash, creator, privateKey);
    res.json({ txHash: tx.hash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`ImageVerify BE listening on http://localhost:${PORT}`);
  console.log(`Using contract address: ${client.getContractAddress()}`);
});
