---
description: Update the player rankings database from local Excel files.
---
# Skill: Update Rankings

Use this skill to update the DynamoDB table with new ranking data from local Excel files. This is required whenever the user provides new spreadsheets in `python_analysis/data`.

## Prerequisites
-   Ensure the new Excel files are placed in:
    -   `python_analysis/data/1QB/Dynasty1QBRankings_*.xlsx`
    -   `python_analysis/data/superflex/SuperflexRankings_*.xlsx`
-   Ensure the filenames match what the script expects (or update the script).

## Usage
Execute the `local_data_processor.py` script. This script:
1.  Fetches the latest base player list from FantasyCalc.
2.  Reads the local 1QB and Superflex Excel files.
3.  Merges the data based on cleansed names.
4.  Updates all configured `PlayerValue` tables in DynamoDB (Dev and Prod).

```powershell
$env:PYTHONPATH="python_analysis"; python python_analysis/local_data_processor.py
```

## When to Use
-   When the user provides new ranking spreadsheets.
-   When "My Rank" or "Value Gap" columns seem outdated.

## Verification
-   Check the output logs for "Successfully updated X records".
-   Verify the frontend Team View shows the new ranks.
