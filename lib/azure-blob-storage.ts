import { Construct } from "constructs";
import { CfnAzureBlobStorage } from "./cfn-azure-blob-storage";

// L2 Construct
export class AzureBlobStorage extends Construct {
  public readonly blobContainerUrl: string;

  constructor(
    scope: Construct,
    id: string,
    subscriptionId: string,
    clientId: string,
    tenantId: string,
    clientSecretName: string
  ) {
    super(scope, id);

    const azureBlobStorage = new CfnAzureBlobStorage(
      this,
      "CfnAzureBlobStorage",
      {
        subscriptionId: subscriptionId,
        clientId: clientId,
        tenantId: tenantId,
        clientSecretName: clientSecretName,
      }
    );

    this.blobContainerUrl = azureBlobStorage.ref;
  }
}