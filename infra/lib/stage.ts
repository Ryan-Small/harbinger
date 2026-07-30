import { Stage, type StageProps } from "aws-cdk-lib";
import type { Construct } from "constructs";
import type { EnvironmentConfig } from "../config/environment";
import { FoundationStack } from "./foundation-stack";
import { AppStack } from "./app-stack";
import { WebStack } from "./web-stack";

export interface HarbingerStageProps extends StageProps {
    config: EnvironmentConfig;
}

/**
 * One complete environment. Instantiated once per env in bin/harbinger.ts,
 * so environments can never structurally diverge — only their configs can.
 */
export class HarbingerStage extends Stage {
    readonly foundation: FoundationStack;
    readonly app: AppStack;
    readonly web: WebStack;

    constructor(scope: Construct, id: string, props: HarbingerStageProps) {
        super(scope, id, props);
        const { config } = props;

        // Lowercase ids here because they become deployed stack names —
        // ops-facing, kebab-case like every other external name in the
        // project. Ids inside stacks stay PascalCase; they never leave code.
        this.foundation = new FoundationStack(this, "foundation", { config });
        this.app = new AppStack(this, "app", {
            config,
            vpc: this.foundation.vpc,
        });
        this.web = new WebStack(this, "web", { config });
    }
}
