import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { expect, test } from "vitest";
import { envConfigsProd } from "../config/prod";
import { HarbingerStage } from "../lib/stage";

// The assertions below encode the plan's intentional design. These
// are the things a future refactor must not silently change.
const stage = new HarbingerStage(new App(), "Test", { config: envConfigsProd });
const foundation = Template.fromStack(stage.foundation);
const app = Template.fromStack(stage.app);

test("exactly one NAT gateway — the deliberate cost/availability trade", () => {
    foundation.resourceCountIs("AWS::EC2::NatGateway", 1);
});

test("database is Aurora Postgres Serverless v2 with the configured capacity range", () => {
    foundation.hasResourceProperties("AWS::RDS::DBCluster", {
        Engine: "aurora-postgresql",
        ServerlessV2ScalingConfiguration: {
            MinCapacity: envConfigsProd.database.minAcu,
            MaxCapacity: envConfigsProd.database.maxAcu,
        },
    });
});

test("database is not publicly accessible", () => {
    foundation.hasResourceProperties("AWS::RDS::DBInstance", {
        PubliclyAccessible: false,
    });
});

test("api tasks run on arm64", () => {
    app.hasResourceProperties("AWS::ECS::TaskDefinition", {
        RuntimePlatform: Match.objectLike({ CpuArchitecture: "ARM64" }),
    });
});

test("load balancer is the only internet-facing entry point", () => {
    app.hasResourceProperties("AWS::ElasticLoadBalancingV2::LoadBalancer", {
        Scheme: "internet-facing",
    });
    app.resourceCountIs("AWS::ElasticLoadBalancingV2::LoadBalancer", 1);
});

test("health checks hit the real route, not the ALB default", () => {
    app.hasResourceProperties("AWS::ElasticLoadBalancingV2::TargetGroup", {
        HealthCheckPath: "/status",
    });
});

test("logical IDs of stateful resources remain static", () => {
    // CloudFormation keys resource identity on these exact IDs: if one
    // changes, the next deploy replaces the resource — for the database,
    // delete-and-recreate. A failure here means a refactor renamed or
    // moved a stateful construct; undo that rename rather than updating
    // the pin, unless replacement is genuinely intended.
    const pinned: Record<string, string[]> = {
        "AWS::EC2::VPC": ["Vpc8378EB38"],
        "AWS::RDS::DBCluster": ["DatabaseB269D8BB"],
        "AWS::RDS::DBInstance": ["DatabaseWriter7794273E"],
    };
    for (const [type, ids] of Object.entries(pinned)) {
        expect(Object.keys(foundation.findResources(type)).sort()).toEqual(ids);
    }
});
