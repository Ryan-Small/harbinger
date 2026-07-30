import createClient, { type ClientOptions } from "openapi-fetch";
import type { paths } from "./schema";

export type { paths } from "./schema";

export interface HarbingerClientOptions extends ClientOptions {
    /**
     * Key for programmatic consumers (bots, scripts), sent as a bearer
     * token. Browser sessions authenticate with cookies instead — pass
     * `credentials: "include"` and no key. Never embed a key in code
     * shipped to a browser: anything a browser holds is public.
     */
    apiKey?: string;
}

/**
 * Typed client for the Harbinger API. Every path and schema is generated
 * from the server's own OpenAPI document, so a request this compiles is a
 * request the server understands.
 */
export function createHarbingerClient(options: HarbingerClientOptions = {}) {
    const { apiKey, ...clientOptions } = options;
    return createClient<paths>({
        baseUrl: "https://api.harbinger.sh",
        ...clientOptions,
        ...(apiKey && {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                ...clientOptions.headers,
            },
        }),
    });
}
