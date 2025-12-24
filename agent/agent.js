const express = require("express");
const { exec } = require("child_process");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const dotenv = require("dotenv");
dotenv.config();

const app = express();
const PORT = 5005;

app.use(bodyParser.json());

// Determine if running in PKG (production) or Node (development)
const isPkg = typeof process.pkg !== "undefined";
const currentDir = isPkg ? path.dirname(process.execPath) : __dirname;

// Define paths
const scriptPath = path.join(currentDir, "finding.ps1");
const defaultResultDir = path.join(currentDir, "Result");

// Log configuration details
console.log("--- DSPM AGENT CONFIG ---");
console.log("Mode:", isPkg ? "Production (PKG)" : "Development");
console.log("Root Path:", currentDir);
console.log("Script Path:", scriptPath);
console.log("Result Dir:", defaultResultDir);
console.log("-------------------------");
// Debug info
console.log("Environment:", isPkg ? "PKG (Production)" : "Node (Development)");
console.log("Current Directory:", currentDir);
console.log("Script Path:", scriptPath);

// Helper function to generate recommendations
const generateRecommendations = (checks) => {
    const recommendations = [];

    if (!checks.scriptExists) {
        recommendations.push(
            "PowerShell script 'finding.ps1' not found. Please ensure the script is in the utils folder."
        );
    }

    if (!checks.scriptReadable) {
        recommendations.push(
            "PowerShell script is not readable. Please check file permissions."
        );
    }

    if (!checks.baseDirectoryExists) {
        recommendations.push(
            "Base directory does not exist. Please create the directory or check the BASE_DIRECTORY environment variable."
        );
    }

    if (!checks.baseDirectoryWritable) {
        recommendations.push(
            "Base directory is not writable. Please check directory permissions."
        );
    }

    if (!checks.powershellAvailable) {
        recommendations.push(
            "PowerShell is not available or not responding. Please ensure PowerShell is installed and accessible."
        );
    }

    if (!checks.environmentVariables.BASE_DIRECTORY) {
        recommendations.push(
            "BASE_DIRECTORY environment variable is not set. Please check your .env file."
        );
    }

    return recommendations;
};

app.get("/", async (req, res) => {
    try {
        const baseDirectory = process.env.BASE_DIRECTORY;

        console.log("Base Directory from ENV:", process.env.BASE_DIRECTORY);
        console.log("Base Directory to use:", baseDirectory);

        const checks = {
            scriptExists: false,
            scriptReadable: false,
            baseDirectoryExists: false,
            baseDirectoryWritable: false,
            powershellAvailable: false,
            environmentVariables: {
                BASE_DIRECTORY: !!process.env.BASE_DIRECTORY,
            },
        };

        // 1. Check script file
        if (fs.existsSync(scriptPath)) {
            checks.scriptExists = true;
            try {
                fs.accessSync(scriptPath, fs.constants.R_OK);
                checks.scriptReadable = true;
            } catch (error) {
                console.log("Script not readable:", error.message);
            }
        }

        // 2. Check base directory
        if (baseDirectory) {
            if (fs.existsSync(baseDirectory)) {
                checks.baseDirectoryExists = true;
                try {
                    fs.accessSync(baseDirectory, fs.constants.W_OK);
                    checks.baseDirectoryWritable = true;
                } catch (error) {
                    console.log("Base directory not writable:", error.message);
                }
            } else {
                // Try to create directory
                try {
                    fs.mkdirSync(baseDirectory, { recursive: true });
                    checks.baseDirectoryExists = true;

                    // Check writability again
                    fs.accessSync(baseDirectory, fs.constants.W_OK);
                    checks.baseDirectoryWritable = true;

                    console.log(`Created base directory: ${baseDirectory}`);
                } catch (error) {
                    console.log("Cannot create base directory:", error.message);
                }
            }
        } else {
            console.log("Base directory is undefined. Using default.");
            checks.baseDirectoryExists = false;
        }

        // 3. Check PowerShell
        const powershellCheck = new Promise((resolve) => {
            const cmd = "powershell.exe -Command \"Get-Host\"";
            const checkProcess = exec(cmd, { windowsHide: true }, (error) => {
                if (error) {
                    console.log("PowerShell check error:", error.message);
                }
                resolve();
            });

            checkProcess.on("exit", (code) => {
                if (code === 0) {
                    checks.powershellAvailable = true;
                }
                resolve();
            });

            setTimeout(resolve, 5000);
        });

        await powershellCheck;

        // Overall status
        const isReady =
            checks.scriptExists &&
            checks.scriptReadable &&
            checks.powershellAvailable &&
            checks.baseDirectoryExists &&
            checks.baseDirectoryWritable

        res.status(200).json({
            message: "Script status check completed",
            data: {
                isReady,
                checks,
                paths: {
                    scriptPath,
                    baseDirectory: baseDirectory || "Not set",
                },
                recommendations: generateRecommendations(checks),
            },
        });
    } catch (error) {
        console.error("Error checking script status:", error);
        res.status(500).json({
            message: "Failed to check script status",
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.post("/scan", async (req, res) => {
    const { sharePath, keyword } = req.body;

    if (!sharePath || !keyword) {
        return res.status(400).json({ message: "Missing params" });
    }

    if (!fs.existsSync(scriptPath)) {
        return res.status(500).json({
            message: "Script finding.ps1 not found. Cannot execute scan.",
            path: scriptPath
        });
    }

    if (!fs.existsSync(defaultResultDir)) {
        try {
            fs.mkdirSync(defaultResultDir, { recursive: true });
            console.log(`Created result directory: ${defaultResultDir}`);
        } catch (err) {
            console.error("Cannot create result directory:", err);
            return res.status(500).json({ message: "Cannot create output directory" });
        }
    }

    console.log(`Executing scan on ${sharePath} for keyword "${keyword}" in script ${scriptPath}`);

    const cmd = `powershell.exe -File "${scriptPath}" -Function Find-SensitiveData -SharePath "${sharePath}" -keyword "${keyword}"`;

    console.log(`Running command: ${cmd}`);

    try {
        const { stdout, stderr } = await new Promise((resolve, reject) => {
            exec(cmd, { 
                windowsHide: true,
            }, (err, stdout, stderr) => {
                if (err) {
                    reject({ error: err, stderr });
                } else {
                    resolve({ stdout, stderr });
                }
            });
        });

        console.log(`Scan completed.`);
        console.log(`STDOUT: ${stdout}`);

        const searchStarted = stdout.match(/Search started for pattern '.*'/)?.[0];
        const searchComplete = stdout.match(/Search complete/)?.[0];
        const outputFile = stdout.match(/Wrote to (.*\.txt)/)?.[1];

        res.status(200).json({
            message: "PowerShell script executed successfully",
            data: {
                searchStarted: searchStarted || null,
                searchComplete: searchComplete || null,
                outputFile: outputFile || null,
            },
            exitCode: 0,
        });
    }
    catch (error) {
        console.error(`Error: ${error.error?.message || error.message}`);
        return res.status(500).json({
            error: error.error?.message || "Unknown error",
            stderr: error.stderr
        });
    }
});

app.get("/query-script-result", (req, res) => {
    try {
        const { outputFile } = req.query;
        let filePath = null;

        if (outputFile) {
            if (path.isAbsolute(outputFile)) {
                filePath = outputFile;
            } else {
                filePath = path.join(defaultResultDir, outputFile);
            }
        } else {
            filePath = path.join(defaultResultDir, "PotentialData-CustomKeyword--daoxu.txt");
        }

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                message: "Result file not found.",
                path: filePath
            });
        }

        const content = fs.readFileSync(filePath, "utf8");
        if (!content) {
            return res.status(404).json({
                message: "Result file is empty.",
            });
        }

        const fileRowsMap = {};
        content
            .split("\n")
            .filter(Boolean)
            .forEach((line) => {
                const lineNumberMatch = line.match(/:(\d+):/);
                if (lineNumberMatch) {
                    const lineNumberIndex = lineNumberMatch.index;
                    const fileName = line.substring(0, lineNumberIndex);
                    const row = parseInt(lineNumberMatch[1], 10);

                    if (!fileRowsMap[fileName]) {
                        fileRowsMap[fileName] = [];
                    }
                    fileRowsMap[fileName].push(row);
                }
            });

        if (Object.keys(fileRowsMap).length === 0) {
            return res.status(404).json({
                message: "No file names found in the result file.",
            });
        }

        res.status(200).json({
            message: "Found file names successfully.",
            data: fileRowsMap,
        });
    } catch (error) {
        console.error("Error extracting file names:", error);
        res.status(500).json({
            message: "Failed to extract file names.",
            error: error.message || "Unknown error",
        });
    }
});

app.listen(PORT, () => {
    console.log(`DSPM Agent running on port ${PORT}`);
});
