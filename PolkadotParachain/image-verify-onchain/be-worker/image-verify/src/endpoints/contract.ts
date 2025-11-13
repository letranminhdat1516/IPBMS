import { Hono } from "hono";
import createContract from "../lib/contractClient";

const router = new Hono();

router.get("/health", (c) => c.json({ ok: true }));

router.get("/verify/:hash", async (c) => {
  try {
    const hash = c.req.param("hash");
    const providerUrl = (c.env as any).RPC_URL as string | undefined;
    const contractAddress = (c.env as any).CONTRACT_ADDRESS as string | undefined;
    const client = createContract({ providerUrl, contractAddress });
    const res = await client.verifyImage(hash);
    return c.json(res);
  } catch (err: any) {
    return c.json({ error: String(err?.message || err) }, 500);
  }
});

router.post("/register", async (c) => {
  try {
    const body = await c.req.json();
    const { hash, creator, privateKey } = body || {};
    if (!hash || !creator) return c.json({ error: "hash and creator are required" }, 400);
    const providerUrl = (c.env as any).RPC_URL as string | undefined;
    const contractAddress = (c.env as any).CONTRACT_ADDRESS as string | undefined;
    const client = createContract({ providerUrl, contractAddress });
    const tx = await client.registerImage(hash, creator, privateKey);
    return c.json({ txHash: tx.hash });
  } catch (err: any) {
    return c.json({ error: String(err?.message || err) }, 500);
  }
});

export { router as contractRouter };
