import { getAccessLogs } from "../services/awsAccessLogs.js";

export async function fetchAccessLogs(req, res) {
  try {
    const logs = await getAccessLogs();
    res.status(200).json({ data: logs });
  } catch (error) {
    console.error("Error fetching access logs:", error);
    res.status(500).json({ error: "Failed to fetch access logs" });
  }
}
