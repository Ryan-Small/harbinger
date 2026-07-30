import { expect, test } from "vitest";
import { createHarbingerClient } from "../src/index";

function captureFetch(body: unknown) {
    const requests: Request[] = [];
    const fetch = async (input: Request) => {
        requests.push(input);
        return new Response(JSON.stringify(body), {
            status: 200,
            headers: { "content-type": "application/json" },
        });
    };
    return { requests, fetch };
}

test("GET /status hits the production API by default and parses the body", async () => {
    const { requests, fetch } = captureFetch({
        serverTime: "2026-01-01T00:00:00.000Z",
    });
    const client = createHarbingerClient({ fetch });

    const { data, error } = await client.GET("/status");

    expect(requests[0]?.url).toBe("https://api.harbinger.sh/status");
    expect(error).toBeUndefined();
    expect(data?.serverTime).toBe("2026-01-01T00:00:00.000Z");
});

test("an apiKey is sent as a bearer token", async () => {
    const { requests, fetch } = captureFetch({
        serverTime: "2026-01-01T00:00:00.000Z",
    });
    const client = createHarbingerClient({ fetch, apiKey: "test-key" });

    await client.GET("/status");

    expect(requests[0]?.headers.get("authorization")).toBe("Bearer test-key");
});
