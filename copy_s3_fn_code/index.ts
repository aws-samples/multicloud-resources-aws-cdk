import { S3Handler, S3Event } from "aws-lambda";
import { S3 } from "@aws-sdk/client-s3";
import { SSM } from "@aws-sdk/client-ssm";
import { SecretsManager } from "@aws-sdk/client-secrets-manager";
import { Logger } from "@aws-lambda-powertools/logger";
import fetch, { Response } from "node-fetch";

const s3 = new S3({});
const ssm = new SSM({});
const secretsManager = new SecretsManager({});

// Consider using logging.DEBUG for development and testing only.
const logger = new Logger({ logLevel: "DEBUG" });

export const handler: S3Handler = async (event: S3Event) => {
  // Azure Blob Container URL
  const AZURE_BLOB_CONTAINER_URL = await getParameterValue(
    "/s3toazurebackupservice/azureblobcontainerurl"
  );

  // Azure Service Principal details
  const AZURE_TENANT_ID = await getParameterValue(
    "/s3toazurebackupservice/azuretenantid"
  );

  const AZURE_CLIENT_ID = await getParameterValue(
    "/s3toazurebackupservice/azureclientid"
  );

  const AZURE_CLIENT_SECRET = await getSecretString(
    "s3toazurebackupservice/azureclientsecret"
  );

  logger.info(`Azure Blob Container Url: ${AZURE_BLOB_CONTAINER_URL}`);

  // Construct the URL to obtain an Azure AD token
  const AZURE_AUTH_URL = `https://login.microsoftonline.com/${AZURE_TENANT_ID}/oauth2/token`;
  const AZURE_RESOURCE = "https://storage.azure.com/";

  // Azure Blob Container Access Token
  const accessToken = await getAzureAuthToken(
    AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET,
    AZURE_RESOURCE,
    AZURE_AUTH_URL
  );

  let success = true;
  let returnMsg = "";
  let s3ObjectUrl = "";

  for (const record of event.Records) {
    s3ObjectUrl = "";

    try {
      const bucketName = record.s3.bucket.name;
      const objectKey = decodeURIComponent(record.s3.object.key).replace(
        /\+/g,
        " "
      );

      logger.info(`Processing object ${objectKey} from bucket ${bucketName}`);

      // Retrieve the object contents from S3
      const getObjectResult = await s3.getObject({
        Bucket: bucketName,
        Key: objectKey,
      });

      const bodyStream = getObjectResult.Body;

      const bodyAsArray = await bodyStream?.transformToByteArray();
      const contentLength = getObjectResult.ContentLength?.toString();

      if (!AZURE_BLOB_CONTAINER_URL || !bodyAsArray || !contentLength) {
        throw new Error(
          "Blob Container URL, File data or content length is undefined"
        );
      } else {
        // Upload the file to Azure Blob Storage
        const response = await uploadToAzureBlobStorage(
          AZURE_BLOB_CONTAINER_URL,
          objectKey,
          bodyAsArray,
          contentLength,
          accessToken
        );

        s3ObjectUrl = `s3://${bucketName}/${objectKey}`;

        if (response.status === 201 || response.status === 202) {
          logger.info(
            `${s3ObjectUrl} is either successfully uploaded to Azure Blob Storage OR the file upload is accepted for processing and will complete shortly.`
          );
        } else {
          success = false;
          logger.error(
            `Error uploading ${s3ObjectUrl} to Azure Blob Storage. ${response.status} - ${response.body}`
          );
        }
      }
    } catch (error) {
      success = false;
      logger.error(
        `Error copying object ${s3ObjectUrl} to Azure Blob Storage: ${error}`
      );
    }
  }

  returnMsg = success
    ? "All files uploaded to Azure successfully."
    : "One or more files failed to upload to Azure. Please check CloudWatch logs for more details.";

  logger.info(returnMsg);

  return;
};

export const uploadToAzureBlobStorage = async (
  blobContainerUrl: string,
  fileName: string,
  fileData: Uint8Array,
  contentLength: string,
  accessToken: string
): Promise<Response> => {
  // Encode the fileName to Base64
  const encodedFileName = encodeURIComponent(fileName);

  // Construct the URL to upload the file to Azure Blob Storage
  const blobUrl = `${blobContainerUrl}/${encodedFileName}`;

  try {
    const response = await fetch(blobUrl, {
      method: "PUT",
      headers: {
        "x-ms-version": "2017-11-09",
        "x-ms-date": new Date().toUTCString(),
        "Authorization": `Bearer ${accessToken}`,
        "x-ms-blob-type": "BlockBlob",
        "Content-Length": contentLength,
      },
      body: fileData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} - ${response.statusText}`);
    }
    return response;
  } catch (error) {
    throw error;
  }
};

export const getAzureAuthToken = async (
  clientId: string | undefined,
  clientSecret: string | undefined,
  resource: string | undefined,
  authUrl: string | undefined
): Promise<string> => {
  if (!clientId || !clientSecret || !resource || !authUrl) {
    throw new Error("One or more required parameters are undefined");
  }

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);
  params.append("resource", resource);

  try {
    const response = await fetch(authUrl, {
      method: "POST",
      body: params,
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status} - ${response.statusText}`);
    }

    const data = await response.json();
    return data["access_token"];
  } catch (error) {
    logger.error("Error obtaining Azure AD token: ", error as Error);
    throw error;
  }
};

export const getParameterValue = async (parameterName: string) => {
  const { Parameter } = await ssm.getParameter({ Name: parameterName });
  return Parameter?.Value;
};

export const getSecretString = async (secretId: string) => {
  const { SecretString } = await secretsManager.getSecretValue({
    SecretId: secretId,
  });
  return SecretString;
};
