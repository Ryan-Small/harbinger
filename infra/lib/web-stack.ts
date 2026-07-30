import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { CfnOutput, Stack, type StackProps } from "aws-cdk-lib";
import {
    aws_certificatemanager as acm,
    aws_cloudfront as cloudfront,
    aws_cloudfront_origins as origins,
    aws_s3 as s3,
    aws_s3_deployment as s3deploy,
} from "aws-cdk-lib";
import type { Construct } from "constructs";
import type { EnvironmentConfig } from "../config/environment";

export interface WebStackProps extends StackProps {
    config: EnvironmentConfig;
}

const distDir = fileURLToPath(new URL("../../apps/web/dist", import.meta.url));

/**
 * Static site hosting: a private bucket served through CloudFront. The
 * asset upload only synthesizes when apps/web/dist exists, so tests and
 * CI can synth the stack without building the site; the deploy workflow
 * always builds first.
 */
export class WebStack extends Stack {
    constructor(scope: Construct, id: string, props: WebStackProps) {
        super(scope, id, props);
        const { config } = props;

        // Same manual-Cloudflare validation story as the api certificate:
        // the CNAME persists, so ACM renews unattended.
        const certificate = config.domainName
            ? new acm.Certificate(this, "SiteCertificate", {
                  domainName: config.domainName,
                  validation: acm.CertificateValidation.fromDns(),
              })
            : undefined;

        const bucket = new s3.Bucket(this, "SiteBucket", {
            blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
        });

        const distribution = new cloudfront.Distribution(this, "Distribution", {
            defaultBehavior: {
                origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
                viewerProtocolPolicy:
                    cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            },
            defaultRootObject: "index.html",
            // A single-page app owns its routing: missing keys come back
            // from S3 as 403 and must serve the shell, not an error page.
            errorResponses: [
                {
                    httpStatus: 403,
                    responseHttpStatus: 200,
                    responsePagePath: "/index.html",
                },
            ],
            // NA/EU edges only — the cheapest class; widen when players
            // outside those regions actually exist.
            priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
            ...(certificate && {
                certificate,
                domainNames: [config.domainName!],
            }),
        });

        if (existsSync(distDir)) {
            new s3deploy.BucketDeployment(this, "DeployAssets", {
                sources: [s3deploy.Source.asset(distDir)],
                destinationBucket: bucket,
                distribution,
                distributionPaths: ["/*"],
            });
        }

        new CfnOutput(this, "DistributionDomain", {
            value: distribution.distributionDomainName,
        });
    }
}
