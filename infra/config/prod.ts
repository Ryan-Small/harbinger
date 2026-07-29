import type { EnvironmentConfig } from "./environment";

export const envConfigsProd: EnvironmentConfig = {
    envName: "prod",
    region: "us-east-1",
    network: {
        natGateways: 1,
    },
    api: {
        cpu: 256,
        memoryMiB: 512,
        desiredCount: 1,
        maxCount: 2,
    },
    database: {
        // Auto-pause is deliberate while prod doubles as the development
        // sandbox; raise minAcu to 0.5 at launch so players never wait
        // out a cold resume.
        minAcu: 0,
        maxAcu: 2,
    },
};
