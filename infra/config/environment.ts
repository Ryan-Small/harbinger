/**
 * Everything that may differ between alpha, beta, and prod lives in this
 * shape, so standing up a new environment is a new config file plus one
 * line in bin/harbinger.ts — never a stack-code change.
 */
export interface EnvironmentConfig {
    envName: "alpha" | "beta" | "prod";
    region: string;
    network: {
        natGateways: number;
    };
    api: {
        cpu: number;
        memoryMiB: number;
        desiredCount: number;
        maxCount: number;
    };
    database: {
        /** 0 enables auto-pause: an idle cluster costs storage only. */
        minAcu: number;
        maxAcu: number;
    };
    /** Absent until DNS is delegated; ALB and CloudFront default names work without it. */
    domainName?: string;
}
