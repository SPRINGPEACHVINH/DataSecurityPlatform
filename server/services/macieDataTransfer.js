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

export const listFindingsWithFilters = async ({ severity, bucketName, type }) => {

    const criteria = {};

    if (severity) {
        criteria["severity.description"] = { eq: [severity] };
    }

    if (type) {
        criteria["type"] = { eq: [type] };
    }

    if (bucketName) {
        criteria["resourcesAffected.s3Bucket.name"] = { eq: [bucketName] };
    }

    const command = new ListFindingsCommand({
        findingCriteria: {
            criterion: criteria,
        },
        maxResults: 50,
    });

    const result = await macieClient.send(command);

    if (!result.ids || result.ids.length === 0) {
        return { findings: [] };
    }

    const details = await client.send(
        new GetFindingsCommand({ findingIds: result.ids })
    );
    console.log("Macie filter criteria:", criteria);

    return { findings: details.findings };
};

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

export function filterFindingsBySensitiveDataType(findings, sensitiveTypes = [], categories = []) {
    return findings
        .map(finding => {
            const sensitiveData = finding?.classificationDetails?.result?.sensitiveData || [];

            const matchedTypes = [];

            for (const category of sensitiveData) {
                if (categories.length > 0 && !categories.includes(category.category)) {
                    continue;
                }

                for (const detection of category.detections) {
                    if (sensitiveTypes.length > 0 && !sensitiveTypes.includes(detection.type)) {
                        continue;
                    }

                    matchedTypes.push({
                        type: detection.type,
                        count: detection.count,
                        category: category.category
                    });
                }
            }

            if (matchedTypes.length === 0) return null;

            return {
                id: finding.id,
                bucket: finding.resourcesAffected?.s3Bucket?.name,
                key: finding.resourcesAffected?.s3Object?.key,
                matchedTypes,
                createdAt: finding.createdAt,
                severity: finding.severity?.description
            };
        })
        .filter(Boolean);
}



