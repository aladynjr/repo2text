const express = require('express');
const path = require('path');
const fs = require('fs-extra');
const app = express();
require('dotenv').config();
const { exec } = require('child_process');



app.get('/repo', async (req, res) => {
    let repoUrl = req.query.repoName;

    if (!repoUrl) {
        return res.status(400).send('Repository URL not specified');
    }

    if (!repoUrl.startsWith('https://github.com/')) {
        repoUrl = `https://github.com/${repoUrl}.git`;
    }

    const repoName = path.basename(repoUrl, '.git');
    const localPath = path.join(__dirname, 'repo', repoName);

    try {
        // Ensure the directory is clean
        await fs.remove(localPath);

        // Clone the repository
        const cloneCommand = process.env.GITHUB_TOKEN
            ? `git clone https://${process.env.GITHUB_TOKEN}@${repoUrl.substring(8)} ${localPath}`
            : `git clone ${repoUrl} ${localPath}`;
        await execPromise(cloneCommand);

        // Read files excluding the ignored ones
        const content = await processFiles(localPath);
        const outputFile = path.join(__dirname, 'output', `${repoName}.txt`);
        await fs.outputFile(outputFile, content.join('')); // Join without newlines

        res.download(outputFile, `${repoName}.txt`);
    } catch (error) {
        console.error('Failed to process repository:', error);
        res.status(500).send(`Server error: ${error.message}`);
    }
});



async function execPromise(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout || stderr);
            }
        });
    });
}
async function processFiles(dir) {
    const ignorePatterns = [ 'LICENSE', 'package-lock.json', 'yarn.lock', 'node_modules', '.DS_Store', '.env', '.env.*', '.git', '.gitignore', 'build', 'dist', 'coverage', '.vscode', '.idea', '*.log', '*.tgz'];
    const mediaExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.mp4', '.mp3'];
    let results = [];

    const files = await fs.readdir(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = await fs.stat(filePath);

        if (ignorePatterns.some(pattern => filePath.includes(pattern))) continue;

        if (stat.isDirectory()) {
            results.push(`Directory: ${file}`);
            const subdirResults = await processFiles(filePath);
            results = results.concat(subdirResults);
        } else {
            const fileExtension = path.extname(file).toLowerCase();
            if (mediaExtensions.includes(fileExtension)) {
                results.push(`File: ${file} (media file, content not displayed)`);
            } else {
                const content = await fs.readFile(filePath, 'utf8');
                const compressedContent = content.replace(/(\r\n|\n|\r)/gm, ""); // Remove all newlines
                results.push(`File: ${file} --- ${compressedContent} ---`);
            }
        }
    }

    return results;
}

app.listen(3000, () => {
    console.log('Server started on port 3000');
});


