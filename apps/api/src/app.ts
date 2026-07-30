import Fastify, { type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
    serializerCompiler,
    validatorCompiler,
    jsonSchemaTransform,
    type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { StatusResponse } from "@harbinger/shared";

export interface AppOptions extends FastifyServerOptions {
    /** Browser origins allowed to call the API with credentials. */
    corsOrigins?: string[];
}

export async function buildApp(opts: AppOptions = {}) {
    const { corsOrigins = [], ...serverOptions } = opts;
    const app = Fastify(serverOptions).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

    // credentials: true from day one — cookie sessions are planned, and
    // credentialed CORS forbids wildcard origins, so the explicit origin
    // list is load-bearing, not a formality.
    await app.register(cors, { origin: corsOrigins, credentials: true });

    await app.register(swagger, {
        openapi: { info: { title: "Harbinger API", version: "0.1.0" } },
        transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: "/docs" });

    app.get(
        "/status",
        { schema: { response: { 200: StatusResponse } } },
        async () => ({
            serverTime: new Date().toISOString(),
        }),
    );

    return app;
}
