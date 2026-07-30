import { App } from "aws-cdk-lib";
import { Match, Template } from "aws-cdk-lib/assertions";
import { test } from "vitest";
import { CiStack } from "../lib/ci-stack";

const template = Template.fromStack(
    new CiStack(new App(), "test-ci", { repository: "Ryan-Small/harbinger" }),
);

test("deploy role is assumable only by this repo's production environment", () => {
    // Without the sub condition, a token minted for ANY GitHub repository
    // could assume the role — this assertion is the security boundary.
    template.hasResourceProperties("AWS::IAM::Role", {
        RoleName: "harbinger-github-deploy",
        AssumeRolePolicyDocument: Match.objectLike({
            Statement: [
                Match.objectLike({
                    Action: "sts:AssumeRoleWithWebIdentity",
                    Condition: {
                        StringEquals: {
                            "token.actions.githubusercontent.com:aud":
                                "sts.amazonaws.com",
                            "token.actions.githubusercontent.com:sub":
                                "repo:Ryan-Small/harbinger:environment:production",
                        },
                    },
                }),
            ],
        }),
    });
});

test("deploy role holds no permissions beyond assuming the CDK bootstrap roles", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
        PolicyDocument: Match.objectLike({
            Statement: [
                Match.objectLike({
                    Action: "sts:AssumeRole",
                    Resource: Match.objectLike({
                        "Fn::Join": Match.arrayWith([
                            Match.arrayWith([
                                Match.stringLikeRegexp(
                                    "role/cdk-hnb659fds-\\*",
                                ),
                            ]),
                        ]),
                    }),
                }),
            ],
        }),
    });
});
