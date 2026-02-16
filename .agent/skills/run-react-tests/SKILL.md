---
description: Run the frontend React unit tests.
---
# Skill: Run React Tests

Use this skill to run the frontend unit tests using `react-scripts test`. This ensures that your changes to the frontend components (e.g., `FleaflickerHomePage.jsx`, `GenericRosterDisplay.jsx`) do not break existing functionality.

## Usage
Execute the following command in the terminal. The flags ensure it runs once and exits, rather than entering interactive watch mode.

```powershell
cd client
$env:CI="true"; npm test -- --passWithNoTests
```

## When to Use
-   After modifying any React component in `client/src`.
-   After updating utility functions in `client/src/utils`.
-   Before marking a frontend task as complete.

## Expected Output
-   A list of passed/failed tests.
-   Exit code 0 for success, non-zero for failure.
