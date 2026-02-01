// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

// AWS Clients
// Region and credentials picked up from environment or ~/.aws/credentials
const s3Client = new S3Client({});
const lambdaClient = new LambdaClient({});

// Configuration
const DATA_BUCKET_NAME = process.env.DATA_BUCKET_NAME;
const PROCESSOR_FUNCTION_NAME = process.env.PROCESSOR_FUNCTION_NAME;

// Map frontend categories to S3 keys
const CATEGORY_MAP = {
    'superflex': 'uploads/superflex/',
    '1qb_dynasty': 'uploads/1QB/dynasty/',
    'redraft': 'uploads/1QB/redraft/',
};

// Use memory storage to get the file buffer directly
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

/**
 * POST /api/admin/upload
 * Expects multipart/form-data with:
 * - file: The file object
 * - category: 'superflex', 'redraft', '1qb_dynasty'
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    const category = req.body.category;
    if (!category || !CATEGORY_MAP[category]) {
        return res.status(400).json({ error: 'Invalid or missing category' });
    }

    if (!DATA_BUCKET_NAME) {
        // Log warning but allow proceeding if testing locally without bucket env
        console.warn('WARNING: DATA_BUCKET_NAME not set. Using mock success for local testing if needed, or erroring.');
        // strictly error for now to ensure config is right
        return res.status(500).json({ error: 'Server misconfiguration: DATA_BUCKET_NAME not set.' });
    }

    const prefix = CATEGORY_MAP[category];
    const timestamp = Date.now();
    // Sanitize filename
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `${prefix}${timestamp}_${safeName}`;

    try {
        const command = new PutObjectCommand({
            Bucket: DATA_BUCKET_NAME,
            Key: key,
            Body: req.file.buffer,
            ContentType: req.file.mimetype
        });

        await s3Client.send(command);

        console.log(`[Admin] Uploaded to S3: s3://${DATA_BUCKET_NAME}/${key}`);

        res.json({
            message: 'File uploaded successfully to S3.',
            filename: key,
            path: `s3://${DATA_BUCKET_NAME}/${key}`
        });
    } catch (error) {
        console.error("[Admin] S3 Upload Error:", error);
        res.status(500).json({ error: 'Failed to upload file to S3.', details: error.message });
    }
});

/**
 * POST /api/admin/process
 * Triggers the Python enrichment Lambda.
 */
router.post('/process', async (req, res) => {
    console.log("[Admin] Triggering Python processing Lambda...");

    if (!PROCESSOR_FUNCTION_NAME) {
        return res.status(500).json({ error: 'Server misconfiguration: PROCESSOR_FUNCTION_NAME not set.' });
    }

    try {
        const command = new InvokeCommand({
            FunctionName: PROCESSOR_FUNCTION_NAME,
            InvocationType: 'Event', // Asynchronous execution
            Payload: JSON.stringify({}) // Pass any needed event data here
        });

        const response = await lambdaClient.send(command);

        console.log(`[Admin] Lambda Triggered. Status: ${response.StatusCode}`);

        res.json({
            message: 'Processing job submitted.',
            statusCode: response.StatusCode
        });

    } catch (error) {
        console.error("[Admin] Lambda Invoke Error:", error);
        res.status(500).json({
            error: 'Failed to trigger processing job.',
            details: error.message
        });
    }
});

module.exports = router;
