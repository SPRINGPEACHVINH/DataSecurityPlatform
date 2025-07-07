import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { config } from "dotenv";
config();

import { Readable } from "stream";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

function streamToString(stream) {
  const chunks = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    stream.on("error", reject);
  });
}

function parseAccessLogLine(line) {
  // Extract quoted fields first
  const quoted = [...line.matchAll(/"([^"]*)"/g)].map((m) => m[1]);

  // Replace all quoted sections with a placeholder
  const unquoted = line.replace(/"[^"]*"/g, "QUOTED");

  const parts = unquoted.trim().split(/\s+/);

  if (parts.length < 17) {
    throw new Error("Unexpected line format");
  }

  return {
    bucketOwner: parts[0],
    bucket: parts[1],
    timestamp: parts[2] + " " + parts[3],
    remoteIP: parts[4],
    requester: parts[5],
    requestId: parts[6],
    operation: parts[7],
    key: parts[8],
    requestURI: quoted[0], // e.g. PUT /... HTTP/1.1
    statusCode: parts[9],
    errorCode: parts[10] !== "-" ? parts[10] : null,
    bytesSent: parts[11],
    objectSize: parts[12],
    totalTime: parts[13],
    turnaroundTime: parts[14],
    referrer: quoted[1],
    userAgent: quoted[2],
  };
}

let cachedLogs = null;
let cacheTime = 0;

export async function getAccessLogs() {
  const logs = [];
  const bucketName = process.env.AWS_ACCESS_LOG_BUCKET;
  console.log("\uD83D\uDCE6 Using log bucket:", bucketName);

  const listCommand = new ListObjectsV2Command({ Bucket: bucketName });
  const listResponse = await s3.send(listCommand);
  const files = listResponse.Contents || [];

  console.log(`\uD83D\uDCC4 Found ${files.length} files`);

  for (const file of files) {
    const getCommand = new GetObjectCommand({
      Bucket: bucketName,
      Key: file.Key,
    });
    const response = await s3.send(getCommand);
    const text = await streamToString(response.Body);

    const lines = text.split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = parseAccessLogLine(line);
        logs.push(parsed);
      } catch (err) {
        console.warn("❌ Skip:", line);
        console.warn("⛔ Parse error:", err.message);
      }
    }
  }

  console.log("✅ Total parsed logs:", logs.length);
  return logs;
}
