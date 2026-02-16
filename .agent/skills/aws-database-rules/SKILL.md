---
description: Rules and schema for interacting with the AWS DynamoDB PlayerValue table.
---
# Skill: AWS Database Rules

Use this skill to understand the data model and access patterns for the application's main DynamoDB table.

## Table Information
-   **Table Name Pattern**: `PlayerValue-*` (Retrieve the full name from `amplify_outputs.json` or environment variables).
-   **Primary Key (Partition Key)**: `sleeper_id` (String).
-   **Sort Key**: None.

## Schema Fields (PlayerValue)
The `PlayerValue` table stores enriched player data, combining static analysis with dynamic market data.

| Field | Type | Description |
| :--- | :--- | :--- |
| `sleeper_id` | String | **PK**. Unique ID from Sleeper API. Use this for lookups. |
| `player_name_original` | String | Player's original name from source data. |
| `full_name` | String | Player's full name (added by playerService as alias for `player_name_original`). |
| `player_cleansed_name` | String | Cleansed name for matching (lowercase, no punctuation). |
| `position` | String | QB, RB, WR, TE, etc. |
| `team` | String | NFL Team Abbreviation (e.g., MIN, KC). |
| `fantasy_calc_value` | Number | Trade value from FantasyCalc API (Market Value). |
| `fc_rank` | Number | Market Rank from FantasyCalc. |
| `overall_rank` | Number | **User's SF Rank**. From Superflex spreadsheet `Overall` column. |
| `one_qb_rank` | Number | **User's 1QB Rank**. From 1QB spreadsheet `Overall` column. |
| `positional_rank` | Number | User's Positional Rank (SF). From `Positional Rank` column. |
| `one_qb_pos_rank` | Number | User's Positional Rank (1QB). From `Positional Rank` column. |
| `tier` | Number | User's Tier (SF). From `Tier` column. |
| `one_qb_tier` | Number | User's Tier (1QB). From `Tier` column. |
| `trend_30_day` | Number | 30-day value trend from FantasyCalc. |
| `redraft_value` | Number | Redraft value from FantasyCalc. |

## Important Field Mappings
- **playerService.js**: Adds `full_name` as alias for `player_name_original` when loading from DynamoDB
- **Matching**: Use `player_cleansed_name` for name-based lookups (removes punctuation, lowercase)
- **Rankings**: `overall_rank` and `one_qb_rank` come from uploaded Excel files, NOT FantasyCalc

## Access Patterns
1.  **Batch Get**: Use `BatchGetItem` with a list of `sleeper_id`s to fetch data for a roster.
2.  **Name Lookup**: Avoid explicit scans. Use `cleanseName` to normalize names if ID lookup fails.

