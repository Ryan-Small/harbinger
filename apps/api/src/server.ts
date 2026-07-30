import { buildApp } from "./app";

const app = await buildApp({
    logger: true,
    corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173").split(
        ",",
    ),
});
await app.listen({ port: Number(process.env.PORT ?? 3000), host: "0.0.0.0" });
