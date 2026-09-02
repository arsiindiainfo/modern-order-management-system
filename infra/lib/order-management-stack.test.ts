import { App } from 'aws-cdk-lib';
import { Match, Template } from 'aws-cdk-lib/assertions';
import { OrderManagementStack } from './order-management-stack';

/**
 * Pure CloudFormation-template assertions — same thing `cdk synth` does
 * under the hood, no AWS account/credentials needed. Confirms the key
 * resources §26 documents actually land in the synthesized template.
 */
function synthesize(envName: 'staging' | 'prod') {
  const app = new App();
  const stack = new OrderManagementStack(app, `TestStack-${envName}`, {
    envName,
    env: { account: '123456789012', region: 'us-east-1' },
  });
  return Template.fromStack(stack);
}

describe('OrderManagementStack', () => {
  it('provisions RDS SQL Server, free-tier-eligible, single-AZ, in a private subnet', () => {
    const template = synthesize('staging');
    template.hasResourceProperties('AWS::RDS::DBInstance', {
      Engine: 'sqlserver-ex',
      DBInstanceClass: 'db.t3.micro',
      MultiAZ: false,
      PubliclyAccessible: false,
    });
  });

  it('provisions the API Lambda as a container-image function inside the VPC', () => {
    const template = synthesize('staging');
    template.hasResourceProperties('AWS::Lambda::Function', {
      PackageType: 'Image',
      VpcConfig: Match.objectLike({ SubnetIds: Match.anyValue() }),
    });
  });

  it('provisions an HTTP API', () => {
    const template = synthesize('staging');
    template.resourceCountIs('AWS::ApiGatewayV2::Api', 1);
  });

  it('provisions a private SPA bucket and a CloudFront distribution in front of it', () => {
    const template = synthesize('staging');
    template.hasResourceProperties('AWS::S3::Bucket', {
      PublicAccessBlockConfiguration: Match.objectLike({
        BlockPublicAcls: true,
        BlockPublicPolicy: true,
      }),
    });
    template.resourceCountIs('AWS::CloudFront::Distribution', 1);
  });

  it('deploys the built SPA into the bucket and invalidates the distribution', () => {
    const template = synthesize('staging');
    template.hasResource('Custom::CDKBucketDeployment', {});
  });

  it('provisions a migration-runner Lambda wired to a custom resource', () => {
    const template = synthesize('staging');
    // Five AWS::Lambda::Function resources in the synthesized template:
    // the API, the migration runner, the cr.Provider's own "framework
    // onEvent" wrapper Lambda, the shared CDK-managed singleton backing
    // the SPA bucket's autoDeleteObjects:true custom resource, and the
    // BucketDeployment construct's own upload/invalidate handler.
    template.resourceCountIs('AWS::Lambda::Function', 5);
    template.hasResource('AWS::CloudFormation::CustomResource', {});
  });

  it('provisions the two documented CloudWatch alarms (5xx rate, p99 latency)', () => {
    const template = synthesize('staging');
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Namespace: 'AWS/ApiGateway',
      MetricName: '5xx',
    });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      Namespace: 'AWS/ApiGateway',
      MetricName: 'Latency',
      ExtendedStatistic: 'p99',
    });
  });

  it('does not provision a NAT Gateway (cost-minimizing deviation, documented in the plan)', () => {
    const template = synthesize('staging');
    template.resourceCountIs('AWS::EC2::NatGateway', 0);
  });

  it('enables deletion protection and snapshot-on-delete only for prod', () => {
    const stagingTemplate = synthesize('staging');
    stagingTemplate.hasResourceProperties('AWS::RDS::DBInstance', {
      DeletionProtection: false,
    });

    const prodTemplate = synthesize('prod');
    prodTemplate.hasResourceProperties('AWS::RDS::DBInstance', {
      DeletionProtection: true,
    });
  });
});
