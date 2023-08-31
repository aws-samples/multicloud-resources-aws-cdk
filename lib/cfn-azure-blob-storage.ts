import { CfnResource } from "aws-cdk-lib";
import { Secret, ISecret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export interface CfnAzureBlobStorageProps {
  subscriptionId: string;
  clientId: string;
  tenantId: string;
  clientSecretName: string;
}

// L1 Construct
export class CfnAzureBlobStorage extends Construct {
  // Allows accessing the ref property
  public readonly ref: string;

  constructor(scope: Construct, id: string, props: CfnAzureBlobStorageProps) {
    super(scope, id);

    const secret = this.getSecret("AzureClientSecret", props.clientSecretName);
    
    const azureBlobStorage = new CfnResource(
      this,
      "ExtensionAzureBlobStorage",
      {
        type: "POC::Azure::BlobStorage",
        properties: {
          AzureSubscriptionId: props.subscriptionId,
          AzureClientId: props.clientId,
          AzureTenantId: props.tenantId,
          AzureClientSecret: secret.secretValue.unsafeUnwrap()
        },
      }
    );

    this.ref = azureBlobStorage.ref;
  }

  private getSecret(id: string, secretName: string) : ISecret {  
    return Secret.fromSecretNameV2(this, secretName.concat("Value"), secretName);
  }
}