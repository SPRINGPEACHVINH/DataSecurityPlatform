import {
  createClassificationJob,
  listClassificationJobs,
  getFindingStats,
  listFindings,
  getFindings,
  listFindingsWithFilters,
  filterFindingsBySensitiveDataType,
} from "../services/macieDataTransfer.js";

import { sendAlertEmail } from "../utils/mailer.js";

export const handleGetFindingDetails = async (req, res) => {
  try {
    const { findingIds } = req.body;

    if (!findingIds || !Array.isArray(findingIds) || findingIds.length === 0) {
      return res.status(400).json({
        message: "findingIds (array) is required",
      });
    }

    const result = await getFindings(findingIds);

    res.status(200).json({
      message: "Finding details retrieved",
      data: result,
    });
  } catch (error) {
    console.error("Get finding details error:", error);
    res.status(500).json({
      message: error.message || "Failed to get finding details",
    });
  }
};

export const handleGetFindingsFilter = async (req, res) => {
  try {
    // Lấy danh sách findingIds
    const findingIdsResponse = await listFindings();
    const findingIds = findingIdsResponse.findingIds;

    if (!findingIds || findingIds.length === 0) {
      return res.status(200).json({
        message: "No findings available",
        data: {
          severity: [],
          type: [],
          bucketName: [],
        },
      });
    }

    // Lấy chi tiết các finding
    const details = await getFindings(findingIds);

    const severitySet = new Set();
    const typeSet = new Set();
    const bucketSet = new Set();

    for (const finding of details.findings) {
      if (finding.severity && finding.severity.description) {
        severitySet.add(finding.severity.description.toUpperCase());
      }

      if (finding.type) {
        typeSet.add(finding.type);
      }

      if (finding.resourcesAffected?.s3Bucket?.name) {
        bucketSet.add(finding.resourcesAffected.s3Bucket.name);
      }
    }

    // Trả về danh sách tùy chọn lọc
    res.status(200).json({
      message: "Findings filters retrieved",
      data: {
        severity: Array.from(severitySet),
        type: Array.from(typeSet),
        bucketName: Array.from(bucketSet),
      },
    });
  } catch (error) {
    console.error("Get findings filter error:", error);
    res.status(500).json({
      message: error.message || "Failed to get findings filter",
    });
  }
};

export const handleFilterFindings = async (req, res) => {
  try {
    const { severity, bucketName, type } = req.query;

    const result = await listFindingsWithFilters({
      severity,
      bucketName,
      type,
    });

    res.status(200).json({
      message: "Filtered findings retrieved",
      data: result,
    });
  } catch (error) {
    console.error("Filter findings error:", error);
    res.status(500).json({
      message: error.message || "Failed to filter findings",
    });
  }
};

export const handleStartMacieScan = async (req, res) => {
  try {
    const { bucketName } = req.body;

    if (!bucketName) {
      return res.status(400).json({
        message: "Missing required field: bucketName",
      });
    }

    const jobName = `DSPM-Scan-${Date.now()}`;
    const roleArn = process.env.AWS_MACIE_ROLE_ARN;

    const result = await createClassificationJob({
      jobName,
      bucketName,
      roleArn,
    });
    res.status(202).json({
      message: "Macie classification job started successfully",
      data: result,
    });
  } catch (error) {
    console.error("Macie start scan error:", error);
    res.status(500).json({
      message: error.message || "Failed to start Macie scan",
    });
  }
};

export const handleListMacieJobs = async (req, res) => {
  try {
    const result = await listClassificationJobs();
    res.status(200).json({
      message: "Macie jobs listed successfully",
      data: result,
    });
  } catch (error) {
    console.error("List Macie jobs error:", error);
    res.status(500).json({
      message: error.message || "Failed to list Macie jobs",
    });
  }
};

export const handleListFindings = async (req, res) => {
  try {
    const result = await listFindings();
    res.status(200).json({
      message: "Findings listed successfully",
      data: result,
    });
  } catch (error) {
    console.error("List findings error:", error);
    res.status(500).json({
      message: error.message || "Failed to list findings",
    });
  }
};

export const handleGetFindingStats = async (req, res) => {
  try {
    const findingIdsResponse = await listFindings();
    const findingIds = findingIdsResponse.findingIds;

    if (!findingIds || findingIds.length === 0) {
      return res.status(200).json({
        message: "No findings found",
        data: {
          alertsSummary: [],
          findings: [],
        },
      });
    }

    const result = await getFindings(findingIds); // ⚠️ Dùng đúng hàm
    const highFindings = result.findings.filter(
      (f) => f?.severity?.description?.toLowerCase() === "high"
    );

    if (highFindings.length > 0) {
      const message = highFindings
        .map((f, i) => {
          return `🔒 [${i + 1}] ${f.title}
📦 Bucket: ${f.resourcesAffected?.s3Bucket?.name}
🗂️ Object: ${f.resourcesAffected?.s3Object?.key}
⚠️ Severity: ${f.severity?.description}
🕒 Time: ${f.createdAt}
🔗 Type: ${f.type}
`;
        })
        .join("\n\n");

      await sendAlertEmail(
        `[ALERT] ${highFindings.length} high-severity findings detected`,
        message
      );
    }

    res.status(200).json({
      message: "Finding statistics retrieved",
      data: result,
    });
  } catch (error) {
    console.error("Get finding statistics error:", error);
    res.status(500).json({
      message: error.message || "Failed to get finding statistics",
    });
  }
};

export const getFindingsBySensitiveType = async (req, res) => {
  try {
    const { sensitiveType, category } = req.query;

    const sensitiveTypes = sensitiveType
      ? Array.isArray(sensitiveType)
        ? sensitiveType
        : [sensitiveType]
      : [];

    const categories = category
      ? Array.isArray(category)
        ? category
        : [category]
      : [];

    // 🔧 FIX: lấy đúng `findingIds` từ response
    const findingListRes = await listFindings();
    const findingIds = findingListRes.findingIds;

    if (!findingIds || findingIds.length === 0) {
      return res.json({ message: "No findings found", data: [] });
    }

    const findingDetailsRes = await getFindings(findingIds);
    const findings = findingDetailsRes.findings || [];

    // 🔍 In ra để debug nếu cần
    console.log(`✅ Total findings fetched: ${findings.length}`);

    const filteredFindings = filterFindingsBySensitiveDataType(
      findings,
      sensitiveTypes,
      categories
    );

    return res.json({
      message: "Filtered findings",
      data: filteredFindings,
    });
  } catch (error) {
    console.error("❌ Error in getFindingsBySensitiveType:", error);
    return res.status(500).json({ message: "Internal server error", error });
  }
};
