---
name: Fleaflicker Integration
description: Guidelines for integrating with Fleaflicker league data, including free agents and roster displays
---

# Fleaflicker Integration Skill

## Overview
This skill documents the patterns and gotchas for working with Fleaflicker league data in the application.

## Key Data Sources

### Fleaflicker API
- **Endpoint**: `/api/fleaflicker/league/:leagueId/data`
- **Returns**: 
  - `master_player_list`: All players in the league
  - `rosters`: Team rosters with player assignments
- **Missing Fields**: Position data is NOT included in Fleaflicker player objects

### FantasyCalc API
- **Endpoint**: `/api/values/fantasycalc`
- **Returns**: Player values keyed by cleansed name
- **Includes**: `position`, `fantasy_calc_value`, `fc_rank`, `trend_30_day`, `redraft_value`, `sleeper_id`
- **Critical**: Position data MUST come from FantasyCalc since Fleaflicker doesn't provide it

## Name Matching Requirements

### CRITICAL: cleanseName Must Match Backend

Frontend and backend MUST use identical `cleanseName` implementations:

```javascript
// CORRECT implementation (matches server/utils/nameUtils.js)
function cleanseName(name) {
    if (typeof name !== 'string') return '';
    
    return name
        .toLowerCase()
        .replace(/\b(jr|sr|ii|iii|iv|v)\b\.?/gi, '') // Remove suffixes
        .replace(/[.'\",]/g, '')                      // Remove punctuation INCLUDING apostrophes
        .replace(/\s+/g, ' ')                         // Normalize whitespace
        .trim();
}
```

**Common Bug**: Keeping apostrophes in frontend causes mismatches:
- ❌ Frontend: `"Ja'Marr Chase"` → `"ja'marr chase"`
- ✅ Backend: `"Ja'Marr Chase"` → `"jamarr chase"`

### Centralized Implementation
Use `client/src/utils/formatting.js` `cleanseName` export instead of reimplementing in each component.

## FantasyCalc Field Mappings

When merging FantasyCalc data, use correct field names:

```javascript
const fcData = fantasyCalcValuesMap.get(cleanseName(player.full_name)) || {};

// CORRECT field names from fantasyCalcService.js:
{
    position: fcData.position,                    // ← REQUIRED for filtering
    fantasy_calc_value: fcData.fantasy_calc_value, // NOT fcData.value
    fc_rank: fcData.fc_rank,                      // NOT fcData.overallRank
    trend_30_day: fcData.trend30Day,
    redraft_value: fcData.redraftValue,
    sleeper_id: fcData.sleeper_id
}
```

## Free Agents Pattern

### Data Flow
1. Fetch Fleaflicker rosters + master player list
2. Fetch FantasyCalc values (keyed by cleansed name)
3. Filter master list to exclude rostered players
4. Merge FantasyCalc data (including position) with free agents
5. Filter by skill positions (QB/WR/RB/TE) and value > 0

### Example Implementation

```javascript
// 1. Get rostered players
const rosteredPlayerNames = new Set();
fleaflickerData.rosters.forEach(roster => {
    roster.players.forEach(player => 
        rosteredPlayerNames.add(cleanseName(player.full_name))
    )
});

// 2. Filter free agents
const actualFreeAgents = masterPlayerList.filter(p => 
    !rosteredPlayerNames.has(cleanseName(p.full_name))
);

// 3. Merge with FantasyCalc (INCLUDE position!)
const fantasyCalcValuesMap = new Map(Object.entries(fantasyCalcValues));
const playersWithValue = actualFreeAgents.map(player => {
    const fcData = fantasyCalcValuesMap.get(cleanseName(player.full_name)) || {};
    return {
        ...player,
        position: fcData.position,              // ← CRITICAL
        fantasy_calc_value: fcData.fantasy_calc_value || 0,
        fc_rank: fcData.fc_rank,
        // ... other fields
    };
});

// 4. Filter by position and value
const skillPositions = ['QB', 'WR', 'RB', 'TE'];
const filtered = playersWithValue.filter(p => 
    skillPositions.includes(p.position) && p.fantasy_calc_value > 0
);
```

## Common Issues

### Issue: "Found 0 relevant players"
**Symptoms**: Free agents page shows 0 players despite having free agents

**Debugging Steps**:
1. Check if cleanseName matches backend (apostrophes stripped?)
2. Verify field names (fantasy_calc_value not value, fc_rank not overallRank)
3. Confirm position field is included from FantasyCalc
4. Check console for position distribution - should show QB/WR/RB/TE not UNDEFINED

**Root Causes**:
- Frontend/backend cleanseName mismatch (apostrophes) → 0 FantasyCalc matches
- Missing position field → all players filtered out by position check
- Wrong field names → players get value=0 → filtered by value > 0 check

### Issue: Players have position: undefined
**Solution**: Ensure position comes from FantasyCalc data merge, not Fleaflicker

## Related Skills
- `aws-database-rules`: DynamoDB player data structure
- `update-rankings`: Custom ranking data processing
