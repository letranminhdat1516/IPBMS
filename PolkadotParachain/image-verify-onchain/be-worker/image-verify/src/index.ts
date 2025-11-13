import { Hono } from "hono";
import { ContentfulStatusCode } from "hono/utils/http-status";
import { contractRouter } from "./endpoints/contract";

// Start a Hono app
const app = new Hono<{ Bindings: Env }>();

app.onError((err, c) => {
	console.error("Global error handler caught:", err);

	return c.json(
		{
			success: false,
			errors: [{ code: 7000, message: "Internal Server Error" }],
		},
		500,
	);
});

// Register contract API router at root
app.route("/", contractRouter);

// Export the Hono app
export default app;
