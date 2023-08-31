import { RemovalPolicy, Duration, CfnOutput } from "aws-cdk-lib";
import { Bucket, BlockPublicAccess, EventType } from "aws-cdk-lib/aws-s3";
import { DockerImageFunction, DockerImageCode } from "aws-cdk-lib/aws-lambda";
import { PolicyStatement, Effect } from "aws-cdk-lib/aws-iam";
import { LambdaDestination } from "aws-cdk-lib/aws-s3-notifications";
import { IStringParameter, StringParameter } from "aws-cdk-lib/aws-ssm";
import { Secret, ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import { AzureBlobStorage } from "./azure-blob-storage";

// L3 Construct
export class S3ToAzureBackupService extends Construct {
  constructor(
    scope: Construct,
    id: string,
    azureSubscriptionIdParamName: string,
    azureClientIdParamName: string,
    azureTenantIdParamName: string,
    azureClientSecretName: string
  ) {
    super(scope, id);

    // Retrieve existing SSM Parameters
    const azureSubscriptionIdParameter = this.getSSMParameter("AzureSubscriptionIdParam", azureSubscriptionIdParamName);
    const azureClientIdParameter = this.getSSMParameter("AzureClientIdParam", azureClientIdParamName);
    const azureTenantIdParameter = this.getSSMParameter("AzureTenantIdParam", azureTenantIdParamName);

    // Retrieve existing Azure Client Secret
    const azureClientSecret = this.getSecret("AzureClientSecret", azureClientSecretName);

    // Create an S3 bucket
    const sourceBucket = new Bucket(this, "SourceBucketForAzureBlob", {
      removalPolicy: RemovalPolicy.RETAIN,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      serverAccessLogsBucket:
        new Bucket(this, "ServerAccessLogsS3Nucket", {
          bucketName: `multicloudbackupstack-accesslogsbucket-${Math.random().toString(36).slice(-6)}`,
          removalPolicy: RemovalPolicy.RETAIN,
          blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
          enforceSSL: true
        }),
      serverAccessLogsPrefix: "s3toazurebackupservice/serveraccesslogs",
    });

    // Create a corresponding Azure Blob Storage account and a Blob Container
    const azurebBlobStorage = new AzureBlobStorage(
      this,
      "MyCustomAzureBlobStorage",
      azureSubscriptionIdParameter.stringValue,
      azureClientIdParameter.stringValue,
      azureTenantIdParameter.stringValue,
      azureClientSecretName
    );

    // Create a lambda function that will receive notifications from S3 bucket
    // and copy the new uploaded object to Azure Blob Storage
    const copyObjectToAzureLambda = new DockerImageFunction(
      this,
      "CopyObjectsToAzureLambda",
      {
        timeout: Duration.seconds(60),
        code: DockerImageCode.fromImageAsset("copy_s3_fn_code", {
          buildArgs: {
            "--platform": "linux/amd64"
          }
        }),
      },
    );

    // Add an IAM policy statement to allow the Lambda function to access the
    // S3 bucket
    sourceBucket.grantRead(copyObjectToAzureLambda);

    // Add an IAM policy statement to allow the Lambda function to get the contents
    // of an S3 object
    copyObjectToAzureLambda.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["s3:GetObject"],
        resources: [`arn:aws:s3:::${sourceBucket.bucketName}/*`],
      })
    );

    // Set up an S3 bucket notification to trigger the Lambda function
    // when an object is uploaded
    sourceBucket.addEventNotification(
      EventType.OBJECT_CREATED,
      new LambdaDestination(copyObjectToAzureLambda)
    );

    // Grant the Lambda function read access to existing SSM Parameters
    azureSubscriptionIdParameter.grantRead(copyObjectToAzureLambda);
    azureClientIdParameter.grantRead(copyObjectToAzureLambda);
    azureTenantIdParameter.grantRead(copyObjectToAzureLambda);

    // Put the Azure Blob Container Url into SSM Parameter Store
    this.createStringSSMParameter(
      "AzureBlobContainerUrl",
      "Azure blob container URL",
      "/s3toazurebackupservice/azureblobcontainerurl",
      azurebBlobStorage.blobContainerUrl,
      copyObjectToAzureLambda
    );

    // Grant the Lambda function read access to the secret
    azureClientSecret.grantRead(copyObjectToAzureLambda);

    // Output S3 bucket arn
    new CfnOutput(this, "sourceBucketArn", {
      value: sourceBucket.bucketArn,
      exportName: "sourceBucketArn",
    });

    // Output the Blob Conatiner Url
    new CfnOutput(this, "azureBlobContainerUrl", {
      value: azurebBlobStorage.blobContainerUrl,
      exportName: "azureBlobContainerUrl",
    });
  }

  private createStringSSMParameter(
    id: string,
    description: string,
    paramName: string,
    paramValue: string,
    lambdaFunction: DockerImageFunction
  ) {
    // Save the parameter to SSM Parameter Store
    const param = new StringParameter(this, id, {
      description: description,
      parameterName: paramName,
      stringValue: paramValue,
    });

    // Grant the Lambda function read access to the parameter
    param.grantRead(lambdaFunction);
  }

  private getSSMParameter(id: string, parameterName: string): IStringParameter {
    return StringParameter.fromStringParameterName(this, id, parameterName);
  }

  private getSecret(id: string, secretName: string): ISecret {
    return Secret.fromSecretNameV2(this, id, secretName);
  }
}