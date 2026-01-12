const router = require("express").Router();
const crypto = require("crypto");
const path = require("path");
const multer = require("multer");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const MAX_UPLOAD_MB = Number(process.env.DTRS_MAX_UPLOAD_MB || 20);
const AWS_REGION = process.env.AWS_REGION;
const AWS_BUCKET = process.env.AWS_S3_BUCKET;
const SIGNED_URL_TTL_SECONDS = Number(process.env.DTRS_SIGNED_URL_TTL || 300);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_UPLOAD_MB * 1024 * 1024,
  },
});

let cachedClient = null;

function getS3Client() {
  if (cachedClient) return cachedClient;
  if (!AWS_REGION) {
    throw new Error("AWS_REGION is required");
  }
  cachedClient = new S3Client({ region: AWS_REGION });
  return cachedClient;
}

function sanitizeFileName(name = "") {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function parseStorageKey(storageKey) {
  if (typeof storageKey !== "string" || !storageKey.trim()) return null;
  if (storageKey.startsWith("placeholder:")) return null;
  if (!storageKey.startsWith("s3:")) return null;
  const raw = storageKey.slice(3);
  const [bucket, ...rest] = raw.split("/");
  const key = rest.join("/");
  if (!bucket || !key) return null;
  return { bucket, key };
}

router.post("/s3", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "file is required" });
    }
    if (!AWS_BUCKET) {
      return res.status(500).json({ error: "AWS_S3_BUCKET is required" });
    }

    const file = req.file;
    const safeName = sanitizeFileName(file.originalname || "document");
    const ext = path.extname(safeName);
    const baseName = ext ? safeName.slice(0, -ext.length) : safeName;
    const random = crypto.randomBytes(6).toString("hex");
    const key = `dtrs/${Date.now()}-${random}-${baseName}${ext}`.replace(/\.{2,}/g, ".");

    const client = getS3Client();
    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype || "application/octet-stream",
    });
    await client.send(command);

    const checksum = crypto.createHash("sha256").update(file.buffer).digest("hex");
    res.json({
      storageKey: `s3:${AWS_BUCKET}/${key}`,
      url: `https://${AWS_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${key}`,
      mimeType: file.mimetype || null,
      size: file.size,
      checksum,
    });
  } catch (err) {
    console.error("[dtrs uploads] error", err);
    res.status(500).json({ error: err.message || "Upload failed" });
  }
});

router.get("/s3-url", async (req, res) => {
  try {
    const parsed = parseStorageKey(req.query.storageKey);
    if (!parsed) {
      return res.status(400).json({ error: "storageKey must reference an uploaded S3 object" });
    }
    if (!AWS_BUCKET) {
      return res.status(500).json({ error: "AWS_S3_BUCKET is required" });
    }
    if (parsed.bucket !== AWS_BUCKET) {
      return res.status(403).json({ error: "storageKey bucket mismatch" });
    }

    const client = getS3Client();
    const command = new GetObjectCommand({ Bucket: parsed.bucket, Key: parsed.key });
    const url = await getSignedUrl(client, command, { expiresIn: SIGNED_URL_TTL_SECONDS });
    res.json({ url });
  } catch (err) {
    console.error("[dtrs uploads] error", err);
    res.status(500).json({ error: err.message || "Unable to generate URL" });
  }
});

module.exports = router;
