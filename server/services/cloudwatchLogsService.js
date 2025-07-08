import { CloudWatchLogsClient, FilterLogEventsCommand } from "@aws-sdk/client-cloudwatch-logs";

const client = new CloudWatchLogsClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function getCloudWatchLogs({ logGroupName, limit = 50, startTime, filterPattern }) {
  const command = new FilterLogEventsCommand({
    logGroupName,
    limit,
    startTime,
    filterPattern, // optional
  });

  const response = await client.send(command);
  return response.events || [];
}
