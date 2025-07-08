import { listBucketsAndFiles } from "../services/s3Service.js";
import { getConnector } from "../services/elasticsearchService.js";
import {
  listFindings,
  getFindings,
  listClassificationJobs,
  getSeverityStats,
} from "../services/macieDataTransfer.js";
import { getDataSourceName } from "../services/purviewDataTransfer.js";
import { getCloudWatchLogs } from "../services/cloudwatchLogsService.js";

export const getOverviewData = async (req, res) => {
  try {
    const [s3Buckets, connectors, findingsList, classificationJobs] =
      await Promise.all([
        listBucketsAndFiles(),
        safeGetConnectorInternal(),
        listFindings(),
        listClassificationJobs(),
      ]);

    const totalSources = (s3Buckets?.length || 0) + (connectors?.length || 0);
    const totalS3Files =
      s3Buckets?.reduce((sum, b) => sum + b.files.length, 0) || 0;
    const newFilesToday =
      s3Buckets?.reduce((sum, b) => {
        return (
          sum +
          b.files.filter((f) => {
            const modified = new Date(f.updated_at);
            const now = new Date();
            return (
              modified.getDate() === now.getDate() &&
              modified.getMonth() === now.getMonth() &&
              modified.getFullYear() === now.getFullYear()
            );
          }).length
        );
      }, 0) || 0;

    const totalESDocs = await safeGetDocumentCountInternal();
    const totalFiles = totalS3Files + totalESDocs;

    const findingIds = findingsList?.ids || [];
    const totalAlerts = findingIds.length;

    const newS3BucketsWeek =
      s3Buckets?.filter((bucket) => {
        const created = new Date(bucket.createdAt || bucket.updated_at);
        return Date.now() - created.getTime() < 7 * 24 * 60 * 60 * 1000;
      }).length || 0;

    const newConnectorsWeek =
      connectors?.filter((c) => {
        const created = new Date(
          c.createdAt || c.created_at || c.timestamp || Date.now()
        );
        return Date.now() - created.getTime() < 7 * 24 * 60 * 60 * 1000;
      }).length || 0;

    const newDataSourcesWeek = newS3BucketsWeek + newConnectorsWeek;

    const activeScans =
      classificationJobs?.items?.filter((job) => job.jobStatus === "RUNNING")
        .length || 0;

    const { alertsSummary, findings } = await getSeverityStats();

    const newAlerts24h = (findings || []).filter((f) => {
      const created = new Date(f.createdAt);
      return Date.now() - created.getTime() < 24 * 60 * 60 * 1000;
    }).length;

    // Tính số lượng file nhạy cảm
    const sensitiveFiles = findings.length;

    // Gom alert theo ngày
    const alertsByDateMap = {};
    (findings || []).forEach((f) => {
      const date = new Date(f.createdAt).toISOString().slice(0, 10); // yyyy-mm-dd
      if (!alertsByDateMap[date]) alertsByDateMap[date] = 0;
      alertsByDateMap[date]++;
    });
    const alertsByDate = Object.entries(alertsByDateMap).map(
      ([date, count]) => ({
        date,
        count: parseInt(count) || 0,
      })
    );

    const logGroupNames = ["/aws/macie/classificationjobs", "/s3/access-logs"];

    const cloudLogs = (
      await Promise.all(logGroupNames.map((g) => getCloudWatchLogsSafe(g)))
    )
      .flat()
      .map((log) => ({ ...log, logGroupName: log.logGroupName })); // ensure logGroupName is present

    const groupedLogs = classifyLogsBySource(cloudLogs);

    const recentActivities = [
      ...groupedLogs.macie.map(parseMacieLog),
      ...groupedLogs.s3.map(parseS3Log),
    ];

    res.status(200).json({
      metrics: {
        totalSources,
        totalFiles,
        securityAlerts: totalAlerts,
        activeScans,
        newFilesToday,
        newAlerts24h,
        newDataSourcesWeek,
        sensitiveFiles,
      },
      recentActivities,
      alertsSummary,
      alertsByDate,
    });
  } catch (error) {
    console.error("❌ Error in getOverviewData:", error);
    res.status(500).json({
      message: "Failed to load overview data.",
      error: error.message,
    });
  }
};

// --------- Helpers ---------

async function safeGetConnectorInternal() {
  try {
    const res = await fetch(
      "http://localhost:4000/api/dashboard/elasticsearch/connector"
    );
    const json = await res.json();
    return json.data || [];
  } catch (err) {
    console.warn("⚠️ Elasticsearch connector fetch failed:", err.message);
    return [];
  }
}

async function safeGetDocumentCountInternal() {
  try {
    const res = await fetch(
      "http://localhost:4000/api/dashboard/elasticsearch/documents"
    );
    const json = await res.json();
    return Array.isArray(json.data) ? json.data.length : 0;
  } catch (err) {
    console.warn("⚠️ Elasticsearch document count failed:", err.message);
    return 0;
  }
}

function classifyLogsBySource(cloudLogs) {
  const groups = {
    s3: [],
    macie: [],
    unknown: [],
  };

  for (const log of cloudLogs) {
    const groupName = (log.logGroupName || "").toLowerCase();

    if (groupName.includes("macie")) {
      groups.macie.push(log);
    } else if (
      groupName.includes("s3") ||
      groupName.includes("access-logs") ||
      groupName.includes("s3logs")
    ) {
      groups.s3.push(log);
    } else {
      groups.unknown.push(log);
    }
  }

  return groups;
}

function parseMacieLog(log) {
  try {
    const parsed = JSON.parse(log.message);
    return {
      type: "macie",
      title: parsed.eventType || "Macie Event",
      description: parsed.description || log.message,
      time: new Date(parsed.occurredAt || log.timestamp).toLocaleTimeString(),
      icon: "M",
    };
  } catch (err) {
    return {
      type: "macie",
      title: "Invalid JSON",
      description: log.message,
      time: new Date(log.timestamp).toLocaleTimeString(),
      icon: "!",
    };
  }
}

function parseS3Log(log) {
  const desc = log.message;
  let title = "S3 Event";
  if (desc.includes("REST.PUT.OBJECT")) title = "Put Object";
  else if (desc.includes("REST.GET.ACL")) title = "Get ACL";
  else if (desc.includes("REST.DELETE.OBJECT")) title = "Delete Object";

  return {
    type: "s3",
    title,
    description: desc.slice(0, 200),
    time: new Date(log.timestamp).toLocaleTimeString(),
    icon: "S",
  };
}

async function getCloudWatchLogsSafe(logGroupName) {
  try {
    const logs = await getCloudWatchLogs({
      logGroupName,
      limit: 10,
    });

    return (logs || []).map((log) => ({ ...log, logGroupName }));
  } catch (err) {
    console.warn(`⚠️ CloudWatch logGroup ${logGroupName} failed:`, err.message);
    return [];
  }
}

// function inferLogType(message = "") {
//   if (message.includes("scan")) return "scan";
//   if (message.includes("alert") || message.includes("violation"))
//     return "alert";
//   if (message.includes("connected") || message.includes("disconnected"))
//     return "connection";
//   return "event";
// }

// function getLogIcon(message = "") {
//   if (message.includes("scan")) return "S";
//   if (message.includes("alert") || message.includes("violation")) return "!";
//   if (message.includes("connected")) return "+";
//   return "*";
// }

// function extractLogTitle(message = "") {
//   return message.length > 40 ? message.slice(0, 40) + "..." : message;
// }
//For Pureview
