---
description: Update player rankings via S3 upload and data processing.
---
# Skill: Update Rankings

Use this skill to update the DynamoDB table with new ranking data from Excel files uploaded via S3. This workflow is used whenever new ranking spreadsheets need to be ingested.

## Workflow Overview
1. **Upload Files**: User uploads Excel files via Admin UI (`http://localhost:3000/admin`)
2. **S3 Storage**: Files are stored in S3 bucket under `uploads/1QB/dynasty/` and `uploads/superflex/`
3. **Process Data**: Python script fetches from S3, merges with FantasyCalc API, writes to DynamoDB
4. **Display**: Rankings appear in League/Team views

## Upload via Admin UI
The preferred method for uploading ranking files:

1. Navigate to `http://localhost:3000/admin`
2. Upload files using the file input fields:
   - **1QB Rankings**: Upload to "1QB (Dynasty)" section
   - **Superflex Rankings**: Upload to "Superflex" section
3. Click "Run Data Update Script" to trigger processing

**Important Excel File Requirements**:
- Rankings must be on the **second sheet** named "Rankings and Tiers"
- Must have columns: `Player`, `Overall`, `Positional Rank`, `Tier`
- First sheet can be "Read Me" or terms page (will be skipped)

## Manual Processing (If Needed)
If the Admin UI processing fails, you can manually run the processor:

```powershell
$env:PYTHONPATH="python_analysis"; python python_analysis/local_data_processor.py
```

## Key Files Modified
- **`python_analysis/local_data_processor.py`**: 
  - Fetches files from S3 instead of local disk
  - Iterates through Excel sheets to find "Rankings and Tiers"
  - Column mapping: `Overall` → `one_qb_rank`/`overall_rank`, `Tier` → `tier`
- **`server/services/playerService.js`**: 
  - Adds `full_name` field mapping from `player_name_original`
- **`server/routes/adminRoutes.js`**: 
  - `/api/admin/upload`: Uploads to S3
  - `/api/admin/process`: Runs local Python processor

## Configuration
- **S3 Bucket**: Set in `server/.env` as `DATA_BUCKET_NAME`
- **DynamoDB Tables**: Hardcoded in `local_data_processor.py` (both dev and prod tables)
- **Region**: `us-east-1`

## Verification
1. Check console output for "Merged 1QB data. Matches: X" and "Merged SF data. Matches: X"
2. Verify "Successfully updated 408 records" messages
3. Refresh frontend Team View - rankings should populate for all players
4. Check players beyond rank 200 (e.g., Oronde Gadsden, Parker Washington)

## Troubleshooting
- **0 Matches**: Check Excel column names match expected: `Overall`, `Positional Rank`, `Tier`
- **Column not found**: Ensure rankings are on sheet named "Rankings and Tiers"
- **Name mismatch**: Player names are cleansed (lowercase, remove punctuation) for matching

