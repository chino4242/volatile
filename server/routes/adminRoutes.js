// server/routes/adminRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { exec } = require('child_process');

// --- Configuration ---
// Base directory where python_analysis/data lives
// server/routes/ -> server/ -> volatile/ -> python_analysis/data
const DATA_BASE_DIR = path.resolve(__dirname, '..', '..', 'python_analysis', 'data');

// Map frontend categories to folder names
const CATEGORY_MAP = {
    'superflex': 'superflex',
    '1qb_dynasty': '1QB/dynasty', // New subfolder
    'redraft': '1QB/redraft',     // New subfolder
};

// --- Multer Storage Engine ---
const storage = multer.diskStorage({
    destination: async function (req, file, cb) {
        const category = req.body.category;

        if (!category || !CATEGORY_MAP[category]) {
            return cb(new Error('Invalid or missing category'));
        }

        const targetFolder = path.join(DATA_BASE_DIR, CATEGORY_MAP[category]);

        try {
            await fs.ensureDir(targetFolder); // Ensure folder exists
            cb(null, targetFolder); // Set destination
        } catch (err) {
            console.error("Error creating directory:", err);
            cb(err);
        }
    },
    filename: function (req, file, cb) {
        // Keep original filename, prepended with timestamp to ensure uniqueness/newest status
        // Format: timestamp_originalName.xlsx
        const timestamp = Date.now();
        // Sanitize filename just in case
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
        cb(null, `${timestamp}_${safeName}`);
    }
});

const upload = multer({ storage: storage });


/**
 * POST /api/admin/upload
 * Expects multipart/form-data with:
 * - file: The file object
 * - category: 'superflex', 'redraft', 'rsp', or 'lrqb'
 */
router.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    console.log(`[Admin] File uploaded: ${req.file.path} (Category: ${req.body.category})`);

    res.json({
        message: 'File uploaded successfully.',
        filename: req.file.filename,
        path: req.file.path
    });
});

/**
 * POST /api/admin/process
 * Triggers the Python enrichment script.
 */
router.post('/process', (req, res) => {
    console.log("[Admin] Triggering Python processing script...");

    // Path to the python script
    const pyScriptDir = path.resolve(__dirname, '..', '..', 'python_analysis');
    const pyScript = path.join(pyScriptDir, 'create_player_data.py');

    // Command to run python script
    const command = `python "${pyScript}"`;

    exec(command, { cwd: pyScriptDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`[Admin] Exec error: ${error}`);
            // Return 500 but also the stderr so admin knows what broke
            return res.status(500).json({
                error: 'Script execution failed.',
                details: stderr || error.message
            });
        }

        console.log(`[Admin] Script Output: ${stdout}`);

        if (stderr) {
            console.warn(`[Admin] Script Stderr: ${stderr}`);
        }

        res.json({
            message: 'Data processing complete.',
            output: stdout
        });
    });
});

module.exports = router;
