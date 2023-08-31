import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { S3ToAzureBackupService } from "./s3-to-azure-backup-service";

export class MultiCloudBackupCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3ToAzureBackupService = new S3ToAzureBackupService(
      this,
      "MyMultiCloudBackupService",
      "/s3toazurebackupservice/azuresubscriptionid",
      "/s3toazurebackupservice/azureclientid",
      "/s3toazurebackupservice/azuretenantid",
      "s3toazurebackupservice/azureclientsecret"
    );
  }
}