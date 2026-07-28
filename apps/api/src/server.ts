import { buildApp } from "./app";

const app = await buildApp({ logger: true });
await app.listen({ port: 3000, host: "0.0.0.0" });
