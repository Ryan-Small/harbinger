import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import { aws_iam as iam } from "aws-cdk-lib";
import type { Construct } from "constructs";

export interface CiStackProps extends StackProps {
    /** GitHub repository allowed to deploy, as "owner/name". */
    repository: string;
}

/**
 * Account-level identity for GitHub Actions. Lives outside the environment
 * stages because the OIDC provider is an account singleton and the deploy
 * role is scoped to a repository, not an environment.
 */
export class CiStack extends Stack {
    constructor(scope: Construct, id: string, props: CiStackProps) {
        super(scope, id, props);

        const provider = new iam.OpenIdConnectProvider(this, "GitHub", {
            url: "https://token.actions.githubusercontent.com",
            clientIds: ["sts.amazonaws.com"],
        });

        const deployRole = new iam.Role(this, "DeployRole", {
            // Physical name is deliberate: the GitHub workflow references
            // this ARN from outside the CDK app, and a stable name keeps
            // that reference readable and independent of stack internals.
            roleName: "harbinger-github-deploy",
            assumedBy: new iam.WebIdentityPrincipal(
                provider.openIdConnectProviderArn,
                {
                    StringEquals: {
                        "token.actions.githubusercontent.com:aud":
                            "sts.amazonaws.com",
                        // Environment-scoped jobs mint environment-form sub
                        // claims (not ref-form). Which branches may deploy to
                        // the production environment is enforced on the GitHub
                        // side by the environment's deployment branch policy.
                        "token.actions.githubusercontent.com:sub": `repo:${props.repository}:environment:production`,
                    },
                },
            ),
        });

        // The role carries no resource permissions of its own: deploys work
        // by assuming the CDK bootstrap roles, which hold the real access.
        deployRole.addToPolicy(
            new iam.PolicyStatement({
                actions: ["sts:AssumeRole"],
                resources: [
                    `arn:aws:iam::${this.account}:role/cdk-hnb659fds-*`,
                ],
            }),
        );

        new CfnOutput(this, "DeployRoleArn", { value: deployRole.roleArn });
    }
}
