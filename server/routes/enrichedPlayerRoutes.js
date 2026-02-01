const express = require('express');
const router = express.Router();
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand, GetCommand, BatchGetCommand } = require("@aws-sdk/lib-dynamodb");

// Initialize DynamoDB Client
// Region is automatically picked up from Lambda environment
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

// Environment variable set by Amplify or manually in Lambda
const TABLE_NAME = process.env.PLAYER_VALUES_TABLE_NAME || 'PlayerValues';

// GET All Enriched Players
router.get('/enriched-players', async (req, res) => {
    try {
        console.log(`Scanning table: ${TABLE_NAME}`);
        const params = {
            TableName: TABLE_NAME
        };

        // Initial Scan
        const command = new ScanCommand(params);
        let response = await docClient.send(command);
        let items = response.Items || [];

        // Handle Pagination (Scan limit is 1MB)
        while (response.LastEvaluatedKey) {
            console.log('Scanning next page...');
            const nextParams = {
                TableName: TABLE_NAME,
                ExclusiveStartKey: response.LastEvaluatedKey
            };
            response = await docClient.send(new ScanCommand(nextParams));
            if (response.Items) {
                items = items.concat(response.Items);
            }
        }

        res.json(items);
    } catch (error) {
        console.error("Error scanning DynamoDB:", error);
        res.status(500).json({ error: "Failed to fetch player data", details: error.message });
    }
});

// GET Single Player by Sleeper ID
router.get('/enriched-players/sleeper/:id', async (req, res) => {
    try {
        const sleeperId = req.params.id;
        const command = new GetCommand({
            TableName: TABLE_NAME,
            Key: { sleeper_id: sleeperId }
        });

        const response = await docClient.send(command);

        if (response.Item) {
            res.json(response.Item);
        } else {
            res.status(404).json({ error: "Player not found" });
        }
    } catch (error) {
        console.error(`Error fetching player ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to fetch player", details: error.message });
    }
});

// POST Batch Get (Replacing logic from api_server.py)
router.post('/enriched-players/batch', async (req, res) => {
    try {
        const { sleeper_ids } = req.body;

        if (!sleeper_ids || !Array.isArray(sleeper_ids)) {
            return res.status(400).json({ error: "Invalid request body. 'sleeper_ids' array required." });
        }

        if (sleeper_ids.length === 0) {
            return res.json([]);
        }

        // DynamoDB BatchGetItem has a limit of 100 items per request
        // For simplicity in this implementation, we will use Promise.all with GetItem 
        // OR chunk the batch requests.
        // Given the scale might be small, Promise.all of GetItem is acceptable but slower.
        // Better: Chunk into 100s.

        // Simple Chunk Implementation
        const chunks = [];
        const chunkSize = 100;
        for (let i = 0; i < sleeper_ids.length; i += chunkSize) {
            chunks.push(sleeper_ids.slice(i, i + chunkSize));
        }

        let allResults = [];

        for (const chunk of chunks) {
            // Corrected: Use String(id) instead of str(id)
            const keys = chunk.map(id => ({ sleeper_id: String(id) }));

            // To use BatchGetCommand, we need to handle Keys structure correctly
            // However, docClient BatchGet is tricky with unmarshaling sometimes.
            // Let's rely on concurrent Get requests for simplicity if batch size is small (< 100)
            // Or just loop sequentially for safety in MVP.

            // Actually, let's use a concurrent loop.
            const promises = chunk.map(id =>
                docClient.send(new GetCommand({
                    TableName: TABLE_NAME,
                    Key: { sleeper_id: String(id) }
                })).then(res => res.Item).catch(err => null)
            );

            const results = await Promise.all(promises);
            allResults = allResults.concat(results.filter(item => item !== null && item !== undefined));
        }

        res.json(allResults);

    } catch (error) {
        console.error("Error in batch fetch:", error);
        res.status(500).json({ error: "Failed to fetch batch", details: error.message });
    }
});

module.exports = router;
