import { listBucketsAndFiles } from "../services/s3Service.js";

export async function getS3Data(req, res) {
  try {
    const data = await listBucketsAndFiles();
    res.json({ data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
