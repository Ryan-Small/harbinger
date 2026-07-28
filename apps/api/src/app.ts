import Fastify, { type FastifyServerOptions } from "fastify";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import {
    serializerCompiler,
    validatorCompiler,
    jsonSchemaTransform,
    type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { StatusResponse } from "@harbinger/shared";

export async function buildApp(opts: FastifyServerOptions = {}) {
    const app = Fastify(opts).withTypeProvider<ZodTypeProvider>();
    app.setValidatorCompiler(validatorCompiler);
    app.setSerializerCompiler(serializerCompiler);

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
