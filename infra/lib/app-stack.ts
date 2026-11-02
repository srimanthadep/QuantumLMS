import { existsSync } from "node:fs"
import * as path from "node:path"
import { Annotations, CfnOutput, Duration, RemovalPolicy, Stack, type StackProps } from "aws-cdk-lib"
import * as cloudfront from "aws-cdk-lib/aws-cloudfront"
import * as origins from "aws-cdk-lib/aws-cloudfront-origins"
import type * as cognito from "aws-cdk-lib/aws-cognito"
import * as ec2 from "aws-cdk-lib/aws-ec2"
import { Platform } from "aws-cdk-lib/aws-ecr-assets"
import * as ecs from "aws-cdk-lib/aws-ecs"
import * as ecsPatterns from "aws-cdk-lib/aws-ecs-patterns"
import * as logs from "aws-cdk-lib/aws-logs"
import * as s3 from "aws-cdk-lib/aws-s3"
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment"
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager"
import type { Construct } from "constructs"

const REPO = path.resolve(__dirname, "..", "..")
/** The web app built for AWS: `npm run deploy` builds it here with the Auth stack's ids. */
export const SITE_DIR = path.join(REPO, "frontend", "dist-aws")

export interface AppStackProps extends StackProps {
  userPool: cognito.IUserPool
  userPoolClient: cognito.IUserPoolClient
  /** Complete ARN of the Secrets Manager secret that holds DATABASE_URL. */
  databaseSecretArn: string
  /** API tasks to run. Each keeps up to DATABASE_POOL_MAX (5) database connections. */
  apiTasks: number
  demoMode: boolean
  campusTz: string
  /** Id of the com.amazonaws.global.cloudfront.origin-facing prefix list; looked up in the region when omitted. */
  cloudFrontPrefixListId?: string
}

/**
 * Everything except sign-in:
 * - a VPC with the API and its load balancer in private subnets (one NAT gateway for outbound calls);
 * - the API from backend/Dockerfile on ECS Fargate, behind an internal Application Load Balancer;
 * - an S3 bucket for uploads (private; browsers use presigned links);
 * - the web app in a private S3 bucket behind CloudFront, which also routes /api/* to the load balancer through a
 *   VPC origin. The browser only ever talks to CloudFront, and the load balancer has no public address.
 */
export class AppStack extends Stack {
  constructor(scope: Construct, id: string, props: AppStackProps) {
    super(scope, id, props)

    const vpc = new ec2.Vpc(this, "Network", {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        { name: "public", subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        { name: "private", subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS, cidrMask: 22 },
      ],
      // S3 traffic (uploads) stays inside AWS instead of going through the NAT gateway.
      gatewayEndpoints: { S3: { service: ec2.GatewayVpcEndpointAwsService.S3 } },
    })

    const uploads = new s3.Bucket(this, "Uploads", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [{ abortIncompleteMultipartUploadAfter: Duration.days(7) }],
    })

    // The API. Its container applies pending migrations, then starts the server (see backend/Dockerfile).
    const cluster = new ecs.Cluster(this, "Cluster", { vpc })
    const databaseUrl = secretsmanager.Secret.fromSecretCompleteArn(this, "DatabaseUrl", props.databaseSecretArn)
    const apiLogs = new logs.LogGroup(this, "ApiLogs", { retention: logs.RetentionDays.ONE_MONTH, removalPolicy: RemovalPolicy.DESTROY })
    const api = new ecsPatterns.ApplicationLoadBalancedFargateService(this, "Api", {
      cluster,
      cpu: 512,
      memoryLimitMiB: 1024,
      runtimePlatform: { cpuArchitecture: ecs.CpuArchitecture.X86_64, operatingSystemFamily: ecs.OperatingSystemFamily.LINUX },
      desiredCount: props.apiTasks,
      publicLoadBalancer: false,
      openListener: false,
      taskSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      minHealthyPercent: 100,
      maxHealthyPercent: 200,
      circuitBreaker: { rollback: true },
      healthCheckGracePeriod: Duration.seconds(90),
      taskImageOptions: {
        containerName: "api",
        image: ecs.ContainerImage.fromAsset(path.join(REPO, "backend"), { platform: Platform.LINUX_AMD64 }),
        containerPort: 4000,
        environment: {
          NODE_ENV: "production",
          PORT: "4000",
          LOG_LEVEL: "info",
          // CloudFront serves the site and /api on one origin, so no other origin needs CORS.
          CORS_ORIGINS: "",
          DATABASE_SSL: "require",
          // Connections per task. Supabase's session pooler allows 15 clients in total on its smallest size.
          DATABASE_POOL_MAX: "5",
          COGNITO_REGION: this.region,
          COGNITO_USER_POOL_ID: props.userPool.userPoolId,
          COGNITO_CLIENT_ID: props.userPoolClient.userPoolClientId,
          STORAGE_DRIVER: "s3",
          S3_BUCKET: uploads.bucketName,
          S3_REGION: this.region,
          DEMO_MODE: String(props.demoMode),
          CAMPUS_TZ: props.campusTz,
        },
        secrets: { DATABASE_URL: ecs.Secret.fromSecretsManager(databaseUrl) },
        logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: "api", logGroup: apiLogs }),
      },
    })
    api.targetGroup.configureHealthCheck({ path: "/api/health", healthyHttpCodes: "200", interval: Duration.seconds(15), timeout: Duration.seconds(5), healthyThresholdCount: 2, unhealthyThresholdCount: 3 })
    api.targetGroup.setAttribute("deregistration_delay.timeout_seconds", "30")

    // What the API does in AWS: read and write uploads; reset the demo accounts' passwords, MFA and groups.
    uploads.grantReadWrite(api.taskDefinition.taskRole)
    props.userPool.grant(
      api.taskDefinition.taskRole,
      "cognito-idp:AdminSetUserPassword",
      "cognito-idp:AdminSetUserMFAPreference",
      "cognito-idp:AdminAddUserToGroup",
      "cognito-idp:AdminRemoveUserFromGroup",
    )

    // Only CloudFront reaches the load balancer, through the VPC origin below.
    const cloudFrontIps =
      props.cloudFrontPrefixListId ?? ec2.PrefixList.fromLookup(this, "CloudFrontOriginFacing", { prefixListName: "com.amazonaws.global.cloudfront.origin-facing" }).prefixListId
    api.loadBalancer.connections.allowFrom(ec2.Peer.prefixList(cloudFrontIps), ec2.Port.tcp(80), "CloudFront VPC origin")

    // The web app.
    const site = new s3.Bucket(this, "Site", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    })
    // Paths without a file extension are the web app's own routes: they all get index.html.
    const appRoutes = new cloudfront.Function(this, "AppRoutes", {
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: "Serves index.html for the web app's routes",
      code: cloudfront.FunctionCode.fromInline(
        [
          "function handler(event) {",
          "  var request = event.request;",
          "  var last = request.uri.split('/').pop();",
          "  if (last.indexOf('.') === -1) request.uri = '/index.html';",
          "  return request;",
          "}",
        ].join("\n"),
      ),
    })
    const distribution = new cloudfront.Distribution(this, "Web", {
      comment: "Quantum LMS",
      defaultRootObject: "index.html",
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(site),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.SECURITY_HEADERS,
        functionAssociations: [{ function: appRoutes, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST }],
      },
      additionalBehaviors: {
        // The API: never cached; every header (Authorization included), query string and cookie is passed on.
        "/api/*": {
          origin: origins.VpcOrigin.withApplicationLoadBalancer(api.loadBalancer, {
            protocolPolicy: cloudfront.OriginProtocolPolicy.HTTP_ONLY,
            httpPort: 80,
            readTimeout: Duration.seconds(60),
          }),
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.HTTPS_ONLY,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy: cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
    })
    const siteOrigin = `https://${distribution.distributionDomainName}`

    // Browsers upload to and download from the uploads bucket directly, with presigned links.
    uploads.addCorsRule({
      allowedOrigins: [siteOrigin],
      allowedMethods: [s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
      allowedHeaders: ["*"],
      exposedHeaders: ["ETag"],
      maxAge: 3000,
    })

    // Bundles and images first (old bundles stay for tabs still running the previous version), then index.html,
    // which browsers always revalidate, then a CloudFront invalidation. Without a build (a bare `cdk deploy` or
    // `cdk destroy`), the site's files stay as they are: deployments keep their files when they're removed.
    if (existsSync(path.join(SITE_DIR, "index.html"))) {
      const files = new s3deploy.BucketDeployment(this, "SiteFiles", {
        sources: [s3deploy.Source.asset(SITE_DIR)],
        destinationBucket: site,
        exclude: ["index.html"],
        prune: false,
        cacheControl: [s3deploy.CacheControl.setPublic(), s3deploy.CacheControl.maxAge(Duration.days(1))],
        memoryLimit: 512,
      })
      const index = new s3deploy.BucketDeployment(this, "SiteIndex", {
        sources: [s3deploy.Source.asset(SITE_DIR)],
        destinationBucket: site,
        exclude: ["*"],
        include: ["index.html"],
        prune: false,
        cacheControl: [s3deploy.CacheControl.noCache()],
        distribution,
        distributionPaths: ["/*"],
      })
      index.node.addDependency(files)
    } else {
      Annotations.of(this).addWarningV2("quantum-lms:no-site-build", `${SITE_DIR} is missing, so the site's files are left as they are. npm run deploy builds and uploads the web app.`)
    }

    new CfnOutput(this, "SiteUrl", { value: siteOrigin })
    new CfnOutput(this, "UploadsBucket", { value: uploads.bucketName })
    new CfnOutput(this, "ApiLogGroup", { value: apiLogs.logGroupName })
    new CfnOutput(this, "ApiCluster", { value: cluster.clusterName })
    new CfnOutput(this, "ApiService", { value: api.service.serviceName })
  }
}
