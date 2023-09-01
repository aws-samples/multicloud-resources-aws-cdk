# Provision multicloud resources using AWS CloudFormation and AWS CDK

One of the most common use cases of the requirement for using components across different cloud providers is the need to maintain data sovereignty while designing disaster recovery (DR) into a solution.

Data sovereignty is **the idea that data is subject to the laws of where it is physically located,** and in some countries extends to regulations that if data is collected from citizens of a geographical area, then the data must reside in servers located in jurisdictions of that geographical area or in countries with a similar scope and rigor in their protection laws.

This requires organisations to remain in compliance with their host country, and in cases such as state government agencies, a stricter scope of within state boundaries, data sovereignty regulations. Unfortunately, not all countries, and especially not all states have multiple regions to select from, when designing where their primary and recovery data backups will reside.

Therefore, the DR solution needs to take advantage of multiple providers in the same geography, and as such a solution must be designed to backup or replicate data across providers.

Intent of this sample application is to demonstrate a simple solution to the above use case. Specifically, how to backup data from an Amazon S3 bucket to an Azure Blob Storage container within the same geography, using AWS event driven behaviour developed in AWS CDK and deployed through AWS CloudFormation.

More importantly, this solution demonstrates how to consolidate the management of secondary cloud resources into a unified infrastructure stack in AWS improving productivity while eliminating the complexity and cost of operating multiple deployment mechanisms into multiple public cloud environments.

## Solution Architecture

![AWS CloudFormation Extension](https://static.us-east-1.prod.workshops.aws/public/6097a5f1-6a34-4843-bdc9-da6c349c6d42/static/Multi-Cloud-IaC-Architecture.jpg)

For more information, please refer to the [AWS Workshop][1].

## Prerequisites
* Activate AWS CloudFormation Extension by following [these instructions][2]
* [Setup AWS CDK][3] on your workstation
* [Download TypeScript][4]
* IDE such as [Visual Studio Code][5]
* Install [Docker Desktop][6]

## Getting Started

Please follow the [AWS Workshop][7].

## License Summary

This sample code is made available under the MIT-0 license. See the LICENSE file.

[1]: https://catalog.us-east-1.prod.workshops.aws/workshops/361cb020-df0e-4b41-956e-8233dcd85f43/en-US/secure-foundation
[2]: https://github.com/aws-samples/aws-cloudformation-azure-storage-resource-provider
[3]: https://docs.aws.amazon.com/cdk/v2/guide/work-with.html
[4]: https://www.typescriptlang.org/download
[5]: https://code.visualstudio.com/
[6]: https://docs.docker.com/desktop/install/mac-install/
[7]: https://catalog.us-east-1.prod.workshops.aws/workshops/361cb020-df0e-4b41-956e-8233dcd85f43/en-US/aws-cdk/add-cfnresource