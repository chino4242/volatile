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
| `full_name` | String | Player's full name. Use `cleanseName` utility for matching. |
| `position` | String | QB, RB, WR, TE, etc. |
| `team` | String | NFL Team Abbreviation (e.g., MIN, KC). |
| `fantasy_calc_value` | Number | Trade value from FantasyCalc API (Market Value). |
| `fc_rank` | Number | Market Rank from FantasyCalc. |
| `overall_rank` | Number | **User's Rank**. Sourced from local 1QB/SF spreadsheets. |
| `one_qb_rank` | Number | **User's 1QB Rank**. Sourced from local 1QB spreadsheet. |
| `tier` | Number | User's Tier (SF). |
| `one_qb_tier` | Number | User's Tier (1QB). |
| `trend_30_day` | Number | 30-day value trend. |
| `redraft_value` | Number | Redraft value. |

## Access Patterns
1.  **Batch Get**: Use `BatchGetItem` with a list of `sleeper_id`s to fetch data for a roster.
2.  **Name Lookup**: avoid explicit scans. Use `cleanseName` to normalize names if ID lookup fails.
