import {
  S3Client,
  ListBucketsCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function listBucketsAndFiles() {
  const bucketsResponse = await s3.send(new ListBucketsCommand({}));
  const result = [];

  for (const bucket of bucketsResponse.Buckets || []) {
    let continuationToken = undefined;
    let allObjects = [];

    do {
      const objectsResponse = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucket.Name,
          ContinuationToken: continuationToken,
        })
      );

      const filteredObjects = (objectsResponse.Contents || []).filter(
        (obj) => !obj.Key.startsWith("AWSLogs/")
      );

      allObjects.push(...filteredObjects);

      continuationToken = objectsResponse.IsTruncated
        ? objectsResponse.NextContinuationToken
        : undefined;
    } while (continuationToken);

    result.push({
      container: bucket.Name,
      type: "AWS S3",
      status: "Connected",
      files: allObjects.map((obj) => ({
        name: obj.Key.split("/").pop(),
        path: `s3://${bucket.Name}/${obj.Key}`,
        container: bucket.Name,
        updated_at: obj.LastModified,
        size: obj.Size,
      })),
    });
  }

  return result;
}
