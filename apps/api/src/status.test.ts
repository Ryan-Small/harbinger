import { expect, test } from "vitest";
import { StatusResponse } from "@harbinger/shared";
import { buildApp } from "./app";

test("GET /status returns the current server time", async () => {
    const app = await buildApp();
    const res = await app.inject({ method: "GET", url: "/status" });

    expect(res.statusCode).toBe(200);
    const body = StatusResponse.parse(res.json());
    expect(Math.abs(Date.now() - Date.parse(body.serverTime))).toBeLessThan(
        5_000,
    );

    await app.close();
});
