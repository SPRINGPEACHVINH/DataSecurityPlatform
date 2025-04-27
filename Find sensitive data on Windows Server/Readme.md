# Find Sensitive Data

PowerShell script to search for sensitive data in a specified shared path using a keyword.

---

## Description

This script invokes the `Find-SensitiveData` function to scan files within a given shared path for a specific keyword.  
Results are saved to a base directory, with an option to force overwrite existing results.

---

## Parameters

| Parameter       | Description |
|-----------------|-------------|
| `-SharePath`     | (Required) The path to the shared directory where the search will be performed. |
| `-keyword`       | (Required) The keyword to search for within the files. |
| `-BaseDirectory` | (Optional) The directory to save the results. Defaults to `C:\Users\<username>`. |
| `-Force`         | (Optional) Switch to force overwriting existing results. |

---


## Usage
Basic usage:
```powershell
.\finding.ps1 -SharePath "\\server\share" -keyword "password"
```
Searches for the keyword "password" in the specified share path and saves the results to the default base directory.

Advanced usage with custom output directory and force overwrite:
```powershell
.\finding.ps1 -SharePath "\\server\share" -keyword "password" -BaseDirectory "C:\Results" -Force
```
Searches for the keyword "password" in the specified share path, saves the results to "C:\Results", and forces the operation to overwrite existing results.

## Notes
- Ensure that the `Find-SensitiveData` function is available in the current session or imported from the correct module.
- To switch to a different function, modify the `Param` block at the beginning of the script and update the function call accordingly. 
