import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import {
  aws_apigatewayv2 as apigwv2,
  aws_apigatewayv2_integrations as apigwv2Integrations,
  aws_cloudfront as cloudfront,
  aws_cloudfront_origins as origins,
  aws_cloudwatch as cloudwatch,
  aws_cloudwatch_actions as cwActions,
  aws_ec2 as ec2,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_rds as rds,
  aws_s3 as s3,
  aws_secretsmanager as secretsmanager,
  aws_sns as sns,
  custom_resources as cr,
} from 'aws-cdk-lib';
import { Construct } from 'constructs';

export interface OrderManagementStackProps extends cdk.StackProps {
  envName: 'staging' | 'prod';
}

/**
 * The primary compute path §26 documents: Lambda + API Gateway, not ECS
 * (ECS Fargate is named there only as a fallback if cold starts become a
 * real problem). One stack, parameterized by envName so `staging` and
 * `prod` are independently deployable instances of the same app.
 */
export class OrderManagementStack extends cdk.Stack {
  public readonly httpApi: apigwv2.HttpApi;
  public readonly database: rds.DatabaseInstance;
  public readonly distribution: cloudfront.Distribution;
  public readonly alarmTopic: sns.Topic;

  constructor(scope: Construct, id: string, props: OrderManagementStackProps) {
    super(scope, id, props);

    const { envName } = props;
    const isProd = envName === 'prod';
    const backendImageContext = path.join(__dirname, '..', '..', 'backend');

    // ── Networking ──────────────────────────────────────────────────
    // No NAT Gateway — the dominant non-free-tier hourly cost in a
    // "default" VPC setup. The Lambda only ever needs to reach RDS
    // (already intra-VPC) and Secrets Manager, which is reached via a
    // VPC interface endpoint instead.
    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        { name: 'public', subnetType: ec2.SubnetType.PUBLIC, cidrMask: 24 },
        {
          name: 'isolated',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
      ],
    });

    const lambdaSecurityGroup = new ec2.SecurityGroup(
      this,
      'LambdaSecurityGroup',
      {
        vpc,
        description: 'API and migration-runner Lambdas',
        allowAllOutbound: true,
      },
    );

    const dbSecurityGroup = new ec2.SecurityGroup(
      this,
      'DatabaseSecurityGroup',
      {
        vpc,
        description: 'RDS SQL Server',
        allowAllOutbound: false,
      },
    );
    dbSecurityGroup.addIngressRule(
      lambdaSecurityGroup,
      ec2.Port.tcp(1433),
      'Lambdas -> RDS',
    );

    vpc.addInterfaceEndpoint('SecretsManagerEndpoint', {
      service: ec2.InterfaceVpcEndpointAwsService.SECRETS_MANAGER,
      subnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
    });

    // ── Secrets ─────────────────────────────────────────────────────
    // RDS SQL Server reserves "sa" — dbadmin is the local-dev "sa"
    // equivalent up here. DB credentials never appear in code or env
    // files, matching this project's existing discipline (§26's table).
    const jwtSecret = new secretsmanager.Secret(this, 'JwtSecret', {
      description: 'JWT signing secret',
      generateSecretString: { passwordLength: 48, excludePunctuation: true },
    });

    // ── Database ────────────────────────────────────────────────────
    // Express edition (License Included) — the free-tier-eligible RDS
    // SQL Server option. Local dev uses Developer edition (free,
    // superset of Express); every feature this project actually uses —
    // tables, stored procedures, functions, RAISERROR, transactions —
    // is identical across editions, but this substitution is worth
    // flagging explicitly rather than silently assumed.
    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.sqlServerEx({
        // SQL Server 2022 — matches docker-compose.yml's local dev image.
        // A specific patch version (not the bare VER_16) is required —
        // RDS's CloudFormation validation rejects an unpinned major
        // version, and pinning is the more production-appropriate choice
        // anyway (a floating "latest" patch is fine for local dev, not
        // for a database RDS manages upgrades for).
        version: rds.SqlServerEngineVersion.VER_16_00_4236_2_V1,
      }),
      instanceType: ec2.InstanceType.of(
        ec2.InstanceClass.T3,
        ec2.InstanceSize.MICRO,
      ),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [dbSecurityGroup],
      credentials: rds.Credentials.fromGeneratedSecret('dbadmin'),
      allocatedStorage: 20,
      maxAllocatedStorage: 20, // storage autoscaling is a real-cost surprise risk on a demo — capped explicitly
      storageEncrypted: true, // no extra cost on db.t3.micro, no reason to leave data at rest unencrypted
      multiAz: false,
      publiclyAccessible: false,
      removalPolicy: isProd
        ? cdk.RemovalPolicy.SNAPSHOT
        : cdk.RemovalPolicy.DESTROY,
      deletionProtection: isProd,
      backupRetention: isProd ? cdk.Duration.days(7) : cdk.Duration.days(0),
    });

    // ── API Lambda (container image) ───────────────────────────────
    // An explicit LogGroup (rather than the deprecated `logRetention`
    // prop) avoids provisioning an extra custom-resource Lambda per
    // stack just to set retention.
    const apiFunctionLogGroup = new logs.LogGroup(this, 'ApiFunctionLogGroup', {
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
    const apiFunction = new lambda.DockerImageFunction(this, 'ApiFunction', {
      code: lambda.DockerImageCode.fromImageAsset(backendImageContext),
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [lambdaSecurityGroup],
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NODE_ENV: 'production',
        DB_HOST: database.dbInstanceEndpointAddress,
        DB_PORT: database.dbInstanceEndpointPort,
        DB_NAME: 'OrderManagementSystem',
        DB_SECRET_ARN: database.secret!.secretArn,
        DB_TRUST_SERVER_CERTIFICATE: 'false',
        JWT_SECRET_ARN: jwtSecret.secretArn,
        JWT_ACCESS_EXPIRES_IN: '15m',
        JWT_REFRESH_EXPIRES_DAYS: '7',
      },
      logGroup: apiFunctionLogGroup,
    });
    database.secret!.grantRead(apiFunction);
    jwtSecret.grantRead(apiFunction);

    // ── HTTP API ────────────────────────────────────────────────────
    const httpApi = new apigwv2.HttpApi(this, 'HttpApi', {
      defaultIntegration: new apigwv2Integrations.HttpLambdaIntegration(
        'ApiIntegration',
        apiFunction,
      ),
    });

    // ── Frontend hosting: S3 + CloudFront (OAC), per §26's table ──────
    const spaBucket = new s3.Bucket(this, 'SpaBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });

    // Provisioned per §26's documented architecture (invoices/packing
    // slips, presigned-URL access) — no application code in Phases 0-5
    // generates or writes to this bucket yet; that feature was never
    // built, this is the infrastructure the doc describes, not a
    // retroactive feature addition.
    const documentsBucket = new s3.Bucket(this, 'DocumentsBucket', {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: isProd
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
    });
    documentsBucket.grantReadWrite(apiFunction);

    const distribution = new cloudfront.Distribution(this, 'Distribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(spaBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      additionalBehaviors: {
        '/api/*': {
          origin: new origins.HttpOrigin(
            `${httpApi.apiId}.execute-api.${this.region}.amazonaws.com`,
          ),
          viewerProtocolPolicy:
            cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
          originRequestPolicy:
            cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
        },
      },
      errorResponses: [
        // SPA client-side routing — an unknown path is index.html, not a CloudFront 404.
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    // ── Migrations against a private-subnet database ──────────────────
    // GitHub-hosted runners can't reach RDS directly (private subnets,
    // no NAT/bastion/public access — deliberately). A small VPC-attached
    // Lambda, invoked once per deploy via a CDK custom resource, runs
    // the same migration logic backend/src/database/data-source.ts
    // already uses locally.
    const migrationFunctionLogGroup = new logs.LogGroup(
      this,
      'MigrationFunctionLogGroup',
      {
        retention: logs.RetentionDays.ONE_MONTH,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );
    const migrationFunction = new lambda.DockerImageFunction(
      this,
      'MigrationFunction',
      {
        code: lambda.DockerImageCode.fromImageAsset(backendImageContext, {
          cmd: ['database/run-migrations.handler'],
        }),
        vpc,
        vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
        securityGroups: [lambdaSecurityGroup],
        memorySize: 512,
        timeout: cdk.Duration.minutes(5),
        environment: {
          DB_HOST: database.dbInstanceEndpointAddress,
          DB_PORT: database.dbInstanceEndpointPort,
          DB_NAME: 'OrderManagementSystem',
          DB_SECRET_ARN: database.secret!.secretArn,
          DB_TRUST_SERVER_CERTIFICATE: 'false',
        },
        logGroup: migrationFunctionLogGroup,
      },
    );
    database.secret!.grantRead(migrationFunction);

    const migrationProvider = new cr.Provider(this, 'MigrationProvider', {
      onEventHandler: migrationFunction,
    });

    new cdk.CustomResource(this, 'RunMigrations', {
      serviceToken: migrationProvider.serviceToken,
      properties: {
        // Forces the custom resource to re-invoke on every deploy —
        // migrations are idempotent (tracked via migrations_history),
        // so always running them is correct, not just on first create.
        DeployTrigger: this.node.addr + Date.now().toString(),
      },
    });

    // ── CloudWatch alarms (§26's table: 5xx rate, p99 latency) ────────
    const alarmTopic = new sns.Topic(this, 'AlarmTopic', {
      displayName: `OrderManagementSystem ${envName} alarms`,
    });

    const serverErrorMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: '5xx',
      dimensionsMap: { ApiId: httpApi.apiId },
      statistic: 'Sum',
      period: cdk.Duration.minutes(5),
    });
    new cloudwatch.Alarm(this, 'ServerErrorAlarm', {
      metric: serverErrorMetric,
      threshold: 5,
      evaluationPeriods: 1,
      alarmDescription: '5 or more 5xx responses in a 5-minute window',
    }).addAlarmAction(new cwActions.SnsAction(alarmTopic));

    const latencyMetric = new cloudwatch.Metric({
      namespace: 'AWS/ApiGateway',
      metricName: 'Latency',
      dimensionsMap: { ApiId: httpApi.apiId },
      statistic: 'p99',
      period: cdk.Duration.minutes(5),
    });
    new cloudwatch.Alarm(this, 'LatencyAlarm', {
      metric: latencyMetric,
      threshold: 3000,
      evaluationPeriods: 3,
      alarmDescription:
        'p99 latency over 3s for 3 consecutive 5-minute windows',
    }).addAlarmAction(new cwActions.SnsAction(alarmTopic));

    // ── Outputs ─────────────────────────────────────────────────────
    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${distribution.distributionDomainName}`,
    });
    new cdk.CfnOutput(this, 'ApiUrl', { value: httpApi.apiEndpoint });
    new cdk.CfnOutput(this, 'SpaBucketName', { value: spaBucket.bucketName });
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
    });
    new cdk.CfnOutput(this, 'AlarmTopicArn', { value: alarmTopic.topicArn });

    // Exposed for the CDK assertions test and any future cross-stack use.
    this.httpApi = httpApi;
    this.database = database;
    this.distribution = distribution;
    this.alarmTopic = alarmTopic;
  }
}
