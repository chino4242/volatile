---
description: Run the backend Python analysis tests.
---
# Skill: Run Python Tests

Use this skill to run the Python unit tests for the data analysis scripts. This uses `pytest` to discover and run tests in the `python_analysis/tests` directory.

## Usage
Execute the following command in the terminal. Setting `PYTHONPATH` ensures that the tests can import modules from the parent directory.

```powershell
$env:PYTHONPATH="python_analysis"; python -m pytest python_analysis/tests
```

## When to Use
-   After modifying data processing scripts (e.g., `local_data_processor.py`, `amplify_processing_handler.py`).
-   After updating shared Python utilities (`name_utils.py`, `services.py`).
-   Before running the ranking update script.

## Expected Output
-   A standard pytest summary (dots/Fs).
-   Exit code 0 for success, non-zero for failure.
