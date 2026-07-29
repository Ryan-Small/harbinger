import { App } from "aws-cdk-lib";
import { envConfigsProd } from "../config/prod";
import { HarbingerStage } from "../lib/stage";

// Every environment is declared here so that any commit synthesizes all
// of them deterministically; deploys select one by stack name, e.g.
// `cdk deploy 'harbinger-prod-*'`.
const app = new App();

new HarbingerStage(app, "harbinger-prod", {
    config: envConfigsProd,
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: envConfigsProd.region,
    },
});
