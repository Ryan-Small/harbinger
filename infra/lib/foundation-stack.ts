import { RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib";
import { aws_ec2 as ec2, aws_rds as rds } from "aws-cdk-lib";
import type { Construct } from "constructs";
import type { EnvironmentConfig } from "../config/environment";

export interface FoundationStackProps extends StackProps {
    config: EnvironmentConfig;
}

/**
 * Stateful, slow-changing resources: network and database. Kept apart from
 * the app stack so that no application deploy can ever cascade into
 * replacing something that holds data.
 */
export class FoundationStack extends Stack {
    readonly vpc: ec2.Vpc;
    readonly database: rds.DatabaseCluster;

    constructor(scope: Construct, id: string, props: FoundationStackProps) {
        super(scope, id, props);
        const { config } = props;

        this.vpc = new ec2.Vpc(this, "Vpc", {
            maxAzs: 2,
            natGateways: config.network.natGateways,
            subnetConfiguration: [
                {
                    name: "public",
                    subnetType: ec2.SubnetType.PUBLIC,
                    cidrMask: 24,
                },
                {
                    name: "app",
                    subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidrMask: 24,
                },
                {
                    // No route to the internet at all: the database is
                    // reachable only from inside the VPC.
                    name: "data",
                    subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
                    cidrMask: 24,
                },
            ],
        });

        this.database = new rds.DatabaseCluster(this, "Database", {
            engine: rds.DatabaseClusterEngine.auroraPostgres({
                version: rds.AuroraPostgresEngineVersion.VER_16_6,
            }),
            writer: rds.ClusterInstance.serverlessV2("Writer"),
            serverlessV2MinCapacity: config.database.minAcu,
            serverlessV2MaxCapacity: config.database.maxAcu,
            vpc: this.vpc,
            vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
            defaultDatabaseName: "harbinger",
            // A deleted stack leaves a final snapshot behind rather than
            // silently destroying data, without the manual-cleanup burden
            // that RETAIN imposes on pre-launch teardowns.
            removalPolicy: RemovalPolicy.SNAPSHOT,
        });
    }
}
