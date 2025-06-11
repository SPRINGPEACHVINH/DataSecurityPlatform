import {
  Macie2Client,
  ListClassificationJobsCommand,
  CreateClassificationJobCommand,
  DescribeClassificationJobCommand,
  GetFindingStatisticsCommand,
  ListFindingsCommand,
  GetFindingsCommand,
  ListFindingsFiltersCommand,
} from "@aws-sdk/client-macie2";
import dotenv from "dotenv";

dotenv.config();

const macieClient = new Macie2Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function getFindings(findingIds) {
  const command = new GetFindingsCommand({
    findingIds,
  });
  const response = await macieClient.send(command);
  return response;
}

export async function listFindingsWithFilters({ severity, bucketName, type }) {
  const criteria = {};

  if (severity) {
    criteria.severity = {
      eq: [severity],
    };
  }

  if (bucketName) {
    criteria.resourcesAffectedS3BucketName = {
      eq: [bucketName],
    };
  }

  if (type) {
    criteria.type = {
      eq: [type],
    };
  }

  const command = new ListFindingsCommand({
    findingCriteria: { criterion: criteria },
    maxResults: 50,
  });

  const response = await macieClient.send(command);
  return response.findingIds;
}

export async function listClassificationJobs() {
  const command = new ListClassificationJobsCommand({});
  const response = await macieClient.send(command);
  return response;
}

export async function createClassificationJob({ jobName, bucketName, roleArn }) {
  const command = new CreateClassificationJobCommand({
    jobType: "ONE_TIME",
    name: jobName,
    s3JobDefinition: {
      bucketDefinitions: [
        {
          accountId: process.env.AWS_ACCOUNT_ID,
          buckets: [bucketName],
        },
      ],
    },
    managedDataIdentifierSelector: "ALL",
    description: `DSPM scan job for bucket ${bucketName}`,
    initialRun: true,
    jobRoleArn: roleArn,
  });
  const response = await macieClient.send(command);
  return response;
}

export async function getFindingStats(findingIds) {
  const command = new GetFindingsCommand({
    findingIds,
  });
  const response = await macieClient.send(command);
  return response;
}

export async function listFindings() {
  const command = new ListFindingsCommand({});
  const response = await macieClient.send(command);
  return response;
}

export async function getFindingsFilter() {
  const command = new ListFindingsFiltersCommand({});
  const response = await macieClient.send(command);
  return response;
}
