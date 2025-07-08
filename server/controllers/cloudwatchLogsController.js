import { getCloudWatchLogs } from "../services/cloudwatchLogsService.js";

export async function fetchCloudLogs(req, res) {
  try {
    const logGroupName = process.env.S3_CLOUDWATCH_LOG_GROUP || "/s3/access-logs";
    const limit = parseInt(req.query.limit) || 50;
    const filterPattern = req.query.filter || undefined;
    const startTime = req.query.startTime ? parseInt(req.query.startTime) : undefined;

    const logs = await getCloudWatchLogs({ logGroupName, limit, startTime, filterPattern });

    const formatted = logs.map((log, index) => ({
      id: index + 1,
      timestamp: new Date(log.timestamp).toLocaleString(),
      message: log.message,
      ingestionTime: new Date(log.ingestionTime).toLocaleString(),
      logStream: log.logStreamName,
    }));

    res.json({ data: formatted });
  } catch (err) {
    console.error("CloudWatch fetch error:", err);
    res.status(500).json({ error: "Failed to fetch CloudWatch logs" });
  }
}
