import { fileURLToPath } from "node:url";
import { Stack, type StackProps } from "aws-cdk-lib";
import {
    aws_certificatemanager as acm,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecs_patterns as ecsPatterns,
    aws_ecr_assets as ecrAssets,
} from "aws-cdk-lib";
import type { Construct } from "constructs";
import type { EnvironmentConfig } from "../config/environment";

export interface AppStackProps extends StackProps {
    config: EnvironmentConfig;
    vpc: ec2.IVpc;
}

/**
 * Stateless serving layer: the api container behind a public ALB. Safe to
 * deploy, roll back, or destroy freely — state lives in the foundation
 * stack.
 */
export class AppStack extends Stack {
    constructor(scope: Construct, id: string, props: AppStackProps) {
        super(scope, id, props);
        const { config, vpc } = props;

        const cluster = new ecs.Cluster(this, "Cluster", { vpc });

        // DNS stays at Cloudflare, so validation is a CNAME added there by
        // hand. The record persists, which lets ACM renew unattended.
        const certificate = config.domainName
            ? new acm.Certificate(this, "ApiCertificate", {
                  domainName: `api.${config.domainName}`,
                  validation: acm.CertificateValidation.fromDns(),
              })
            : undefined;

        const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
            this,
            "Api",
            {
                cluster,
                cpu: config.api.cpu,
                memoryLimitMiB: config.api.memoryMiB,
                desiredCount: config.api.desiredCount,
                // arm64 is ~20% cheaper per vCPU and matches the architecture
                // local Apple Silicon docker builds produce natively.
                runtimePlatform: {
                    cpuArchitecture: ecs.CpuArchitecture.ARM64,
                    operatingSystemFamily: ecs.OperatingSystemFamily.LINUX,
                },
                taskImageOptions: {
                    // Build context is the repo root: the image needs the
                    // workspace manifests and packages/shared, not just apps/api.
                    image: ecs.ContainerImage.fromAsset(
                        fileURLToPath(new URL("../..", import.meta.url)),
                        {
                            file: "apps/api/Dockerfile",
                            platform: ecrAssets.Platform.LINUX_ARM64,
                        },
                    ),
                    containerPort: 3000,
                    ...(config.domainName && {
                        environment: {
                            CORS_ORIGINS: `https://${config.domainName}`,
                        },
                    }),
                },
                publicLoadBalancer: true,
                ...(certificate && { certificate, redirectHTTP: true }),
                // A deploy that cannot stabilize rolls itself back instead of
                // flapping until a human notices.
                circuitBreaker: { rollback: true },
            },
        );

        service.targetGroup.configureHealthCheck({ path: "/status" });

        service.service
            .autoScaleTaskCount({ maxCapacity: config.api.maxCount })
            .scaleOnCpuUtilization("Cpu", { targetUtilizationPercent: 70 });
    }
}
