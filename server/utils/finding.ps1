#powershell.exe -File ./finding.ps1 -Function Find-SensitiveData -SharePath "..." -keyword "..."
#powershell.exe -File ./finding.ps1 -Function Remove-SensitiveData
Param(
	[Parameter(Mandatory = $true,
		Position = 0)]
	[String]
	$Function,

	[Parameter(Mandatory = $true,
		Position = 1)]
	[ValidateNotNullOrEmpty()]
	[String]
	$SharePath,

	[Parameter(Mandatory = $true,
		Position = 2)]
	[ValidateNotNullOrEmpty()]
	[String]
	$keyword,
		
	[Parameter(Mandatory = $false)]
	[String]
	$BaseDirectory = '/app/utils/Result',

	[Parameter(Mandatory = $false)]
	[String[]]
	$DataFiles = @("PotentialData-*.txt", "FilePaths-*.csv"),

	[Parameter(Mandatory = $false)]
	[Switch]
	$Force
)

$envFile = ".env"
if (Test-Path $envFile) {
	Get-Content $envFile | ForEach-Object {
		if ($_ -match "^\s*([^#][^=]+)\s*=\s*(.+)\s*$") {
			$name = $matches[1].Trim()
			$value = $matches[2].Trim()
			Set-Variable -Name $name -Value $value -Scope Script
		}
	}
}

if ($Script:BASE_DIRECTORY) {
	if ($Script:BASE_DIRECTORY -notmatch '^[A-Za-z]:\\') {
		$Script:BASE_DIRECTORY = Join-Path -Path (Get-Location) -ChildPath $Script:BASE_DIRECTORY
	}
}

function Get-FilePaths {

	[CmdletBinding()]
	Param(
		[Parameter(Mandatory = $true,
			Position = 0)]
		[String]
		$SharePath,
		
		[Parameter(Mandatory = $false)]
		[ValidateNotNullOrEmpty()]
		[String]
		$BaseDirectory = $Script:BASE_DIRECTORY,

		[Parameter(Mandatory = $false)]
		[Switch]
		$Force
	)

	if (-not (Test-Path $SharePath)) {
		Write-Host -ForegroundColor Red "[!] $((Get-Date).ToString('T')) : SharePath '$SharePath' not found. Exiting..."
		throw "SharePath '$SharePath' not found."
		return
	}

	$CurrentUser = $env:USERNAME

	$DefaultOutputFile = Join-Path -Path $BaseDirectory -ChildPath "FilePaths--$($env:USERNAME).csv"

	# If $BaseDirectory doesn't exist, then try to create it
	if ((Test-Path -Path $BaseDirectory) -eq $false) {
		try {
			$null = New-Item -Path $BaseDirectory -ItemType directory
		}
		catch {
			Write-Host -ForegroundColor red "[!] $((Get-Date).ToString('T')) : Unable to create $BaseDirectory"
			Return
		}
	}

	# Assign file structures
	$BaseOutputFile = $BaseDirectory + '/FilePaths-ALL-' + '-' + $CurrentUser + '.csv'	

	# If using -Force then delete previous CSV files
	if ($Force) {
		Remove-Item $BaseOutputFile -ErrorAction SilentlyContinue
	}

	# Assign file existence tests
	$BaseFileExist = Test-Path -Path $BaseOutputFile
	
	# Recursively get ONLY files in provided path under 10MB in size, return the full path to each file, and write to current directory.
	# Write data to specified filename (Default = '.\FilePaths-$($)-$($CurrentUser).txt') in current directory.
	Write-Output "[*] $((Get-Date).ToString('T')) : Recursively searching files in $SharePath and adding to $BaseOutputFile"
		
	if (!$BaseFileExist) {
		Get-ChildItem -Path $SharePath -File -Recurse -ErrorAction SilentlyContinue | Select-Object FullName, Extension, Length | Export-Csv -Path $BaseOutputFile -Delimiter ',' -Encoding UTF8
	}

	# Importing CSV, filtering, and assigning to $FilePaths array
	Write-Output "[*] $((Get-Date).ToString('T')) : Filtering files in $BaseOutputFile adding to the results to $DefaultOutputFile"

	$FilePaths = @()
	$FileExtensions = @('.txt', '.xls', '.csv', '.bat', '.ps1', '.config', '.cmd', '.pem', '.ppk', '.ini', '.xml', '')
	$FileData = Import-Csv -Path $BaseOutputFile -Delimiter ','
                
	foreach ($File in $FileData) {
		# Filtering out unwanted file extensions and files larger than 10MB (had to convert System.Object to integer)
		if (($FileExtensions -contains $File.Extension) -and ([Int64]$File.Length -le 10000000)) {
			$FilePaths += $File
		}
	}
		
	# Export filtered results to CSV
	$FilePaths | Export-Csv -Path $DefaultOutputFile -Delimiter ',' -Encoding UTF8
}

function Find-SensitiveData {
	[CmdletBinding()]
	Param(
		[Parameter(Mandatory = $true,
			Position = 0)]
		[String]
		$SharePath,

		[Parameter(Mandatory = $true,
			Position = 1)]
		[ValidateNotNullOrEmpty()]
		[String]
		$keyword,
		
		[Parameter(Mandatory = $false)]
		[ValidateNotNullOrEmpty()]
		[String]
		$BaseDirectory = $Script:BASE_DIRECTORY,

		[Parameter(Mandatory = $false)]
		[Switch]
		$Force
	)
	
	$CurrentUser = $env:USERNAME
	$BaseDirectory = if ($Script:BASE_DIRECTORY -and (Test-Path $Script:BASE_DIRECTORY)) {
						$Script:BASE_DIRECTORY
					} 
					else {
					    Join-Path $PSScriptRoot "Result"
					}
	$DefaultOutputFile = Join-Path -Path $BaseDirectory -ChildPath "FilePaths--$($env:USERNAME).csv"

	# If $BaseDirectory doesn't exist, then try to create it
	if ((Test-Path -Path $BaseDirectory) -eq $false) {
		try {
			$null = New-Item -Path $BaseDirectory -ItemType directory
		}
		catch {
			Write-Host -ForegroundColor red "[!] $((Get-Date).ToString('T')) : Unable to create $BaseDirectory"
			Return
		}
	}

	# Execute 'Get-FilePaths' function to generate a list of files to search.

	if ($Force) {
		Write-Output "[!] $((Get-Date).ToString('T')) : '-Force' was used. Now removing previous data files"
		Get-FilePaths -SharePath $SharePath -BaseDirectory $BaseDirectory -Force
	}
	else {
		Get-FilePaths -SharePath $SharePath -BaseDirectory $BaseDirectory
	}

	# Get paths/files from generated $DefaultOutputFile.
	if (Test-Path $DefaultOutputFile) {
		# Import CSV
		$FilePaths = Import-Csv -Path $DefaultOutputFile -Delimiter ','

		# Keyword
		if ($keyword) {
			Write-Output "[*] $((Get-Date).ToString('T')) : CustomKeyword - Search started for pattern '$keyword'"

			$PreviousData = $BaseDirectory + "\PotentialData-CustomKeyword-" + '-' + $CurrentUser + '.txt'
			if (Test-Path -Path $PreviousData) {
				Remove-Item $PreviousData
			}

			[void][runspacefactory]::CreateRunspacePool()
			$CpuCount = [Environment]::ProcessorCount
			$MaxThreads = if ($CpuCount -gt 1) {
    			$CpuCount - 1
			} else {
    			1
			}
			$RunspacePool = [runspacefactory]::CreateRunspacePool(1, $MaxThreads)
			$RunspacePool.Open()

			$Method = $Null
			ForEach ($M in [PowerShell].GetMethods() | Where-Object { $_.Name -eq 'BeginInvoke' }) {
				$MethodParameters = $M.GetParameters()
				if (($MethodParameters.Count -eq 2) -and $MethodParameters[0].Name -eq 'input' -and $MethodParameters[1].Name -eq 'output') {
					$Method = $M.MakeGenericMethod([Object], [Object])
					break
				}
			}

			$Jobs = New-Object System.Collections.ArrayList

			foreach ($FilePath in $FilePaths) {
				$ParameterList = @{
					RegexPatternValue = $keyword
					FilePath          = $FilePath
				}

				$PowerShell = [PowerShell]::Create()
				$PowerShell.RunspacePool = $RunspacePool
				[void]$PowerShell.AddScript({
						Param(
							$FilePath,
							$RegexPatternValue
						)
						$data = Select-String -Path $FilePath.FullName -Pattern $RegexPatternValue
						if ($data) {
							$data
						}
					})
				[void]$PowerShell.AddParameters($ParameterList)

				$Output = New-Object Management.Automation.PSDataCollection[Object]
				$Jobs += @{
					PS     = $PowerShell
					Output = $Output
					Result = $Method.Invoke($PowerShell, @($Null, [Management.Automation.PSDataCollection[Object]]$Output))
				}
			}

			Do {
				ForEach ($Job in $Jobs) {
					$JobOutput = $Job.Output.ReadAll()
					if ($JobOutput) {
						$OutFile = "$($BaseDirectory)\PotentialData-CustomKeyword-$($ShareRootDirectory)-$($CurrentUser).txt"
						Add-Content -Value $JobOutput -Path $OutFile
						Write-Output "[*] $((Get-Date).ToString('T')) : Wrote to $OutFile"
					}
				}
				Start-Sleep -Seconds 1
			} while (($Jobs | Where-Object { -not $_.Result.IsCompleted }).Count -gt 0)

			$SleepSeconds = 1
			for ($i = 0; $i -lt $SleepSeconds; $i++) {
				ForEach ($Job in $Jobs) {
					$JobOutput = $Job.Output.ReadAll()
					if ($JobOutput) {
						$OutFile = "$($BaseDirectory)\PotentialData-CustomKeyword-$($ShareRootDirectory)-$($CurrentUser).txt"
						Add-Content -Value $JobOutput -Path $OutFile
						Write-Output "[*] $((Get-Date).ToString('T')) : Wrote to $OutFile"
					}
					$Job.PS.Dispose()
				}
				Start-Sleep -S 1
			}

			$RunspacePool.Dispose()
			Write-Output "[*] $((Get-Date).ToString('T')) : CustomKeyword - Search complete"
		}

	}
	else {
		Write-Warning "[!] $((Get-Date).ToString('T')) : No matching data found in $SharePath. Exiting..."
		Return
	}
	
	Write-Output "[*] $((Get-Date).ToString('T')) : That's All Folks!"
}

function Remove-SensitiveData {
	[CmdletBinding()]
	Param(
		[Parameter(Mandatory = $false)]
		[String[]]
		$DataFiles = @("PotentialData-*.txt", "FilePaths-*.csv"),
		
		[Parameter(Mandatory = $false)]
		[String]
		$BaseDirectory = $Script:BASE_DIRECTORY
	)
	$BaseDirectory = $Script:BASE_DIRECTORY
	# Cleanup files, if possible
	foreach ($DataFile in $DataFiles) {
		if (Test-Path $BaseDirectory\$DataFile) {
			Write-Output "[!] $((Get-Date).ToString('T')) : Removing $BaseDirectory\$DataFile"
			Remove-Item $BaseDirectory\$DataFile
		}
	}
}

if ($Function -eq 'Find-SensitiveData') {
	if ($Force) {
		Find-SensitiveData -SharePath $SharePath -keyword $keyword -BaseDirectory $BaseDirectory -Force
	}
 else {
		Find-SensitiveData -SharePath $SharePath -keyword $keyword -BaseDirectory $BaseDirectory
	}
}
elseif ($Function -eq 'Remove-SensitiveData') {
	Remove-SensitiveData -BaseDirectory $BaseDirectory -DataFiles $DataFiles
}
else {
	Write-Host -ForegroundColor red "[!] $((Get-Date).ToString('T')) : Invalid function name. Please use 'Find-SensitiveData' or 'Remove-SensitiveData'."
	Return
}