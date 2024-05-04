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



app.get('/file-history', async (req, res) => {
    let { repoName, filePath } = req.query;

    if (!repoName || !filePath) {
        return res.status(400).send('Repository name or file path not specified');
    }

    const repoUrl = `https://github.com/${repoName}.git`;
    const localPath = path.join(__dirname, 'repo', path.basename(repoName, '.git'));
    const localFilePath = path.join(localPath, filePath);

    try {
        await fs.remove(localPath);  // Ensure the directory is clean
        const cloneCommand = process.env.GITHUB_TOKEN
            ? `git clone https://${process.env.GITHUB_TOKEN}@${repoUrl.substring(8)} ${localPath}`
            : `git clone ${repoUrl} ${localPath}`;
        await execPromise(cloneCommand);

        const blameCommand = `git blame -p -- ${path.relative(localPath, localFilePath)}`;
        const fileBlame = await execPromise(blameCommand, { cwd: localPath });

        // Split the output into sections per line
        const lines = fileBlame.split('\n');
        const lineHistory = [];
        let currentSection = [];

        // Example: fetch and store the initial commit date
        const initialCommitCommand = `git log --format=%at --reverse -- ${filePath}`;
        const initialCommitTimestamp = await execPromise(initialCommitCommand, { cwd: localPath });
        const initialCommitDate = new Date(parseInt(initialCommitTimestamp.trim(), 10) * 1000).toISOString().substring(0, 10);

        lines.forEach(line => {
            if (line.startsWith('\t')) {  // Detect the start of a new line of code
                if (line.trim().length > 1) {  // Ignore empty lines
                    const authorTimeLine = currentSection.find(l => l.startsWith('author-time '));
                    const unixTimestamp = authorTimeLine ? parseInt(authorTimeLine.split(' ')[1], 10) : null;
                    const date = unixTimestamp ? new Date(unixTimestamp * 1000).toISOString().substring(0, 10) : initialCommitDate;
                    lineHistory.push(`|${date}| ${line.substring(1)}`); // Skip the tab character
                }
                currentSection = []; // Reset for the next section
            } else {
                currentSection.push(line); // Accumulate lines for current section
            }
        });
        res.send(lineHistory.join('\n'));
    } catch (error) {
        console.error('Failed to process file history:', error);
        res.status(500).send(`Server error: ${error.message}`);
    }
});




async function execPromise(command, options = {}) {
    return new Promise((resolve, reject) => {
        // Set the GIT_PAGER environment variable to 'cat' to disable paging
        const env = { ...process.env, GIT_PAGER: 'cat' };

        // Include the modified environment in the execution options
        const execOptions = { ...options, env };

        exec(command, execOptions, (error, stdout, stderr) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout || stderr);
            }
        });
    });
}

    async function processFiles(dir) {
        const ignorePatterns = [ 'LICENSE', 'package-lock.json', 'yarn.lock', 'node_modules', '.DS_Store', '.env', '.env.*', '.git', '.gitignore', 'build', 'dist', 'coverage', '.vscode', '.idea', '*.log', '*.tgz', 'firebase.json', '.firebaserc', 'firestore.rules', 'firestore.indexes.json'];
        const mediaExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.mp4', '.mp3', '.svg', '.ico', '.woff', '.woff2', '.ttf', '.eot', '.webp'];
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
                    // Remove all newlines and replace multiple spaces with a single space
                    const compressedContent = content.replace(/(\r\n|\n|\r)+/gm, " ").replace(/\s\s+/g, ' ');
                    results.push(`File: ${file} --- ${compressedContent} ---`);
                }
            }
        }
    
        return results;
    }
    

app.listen(3000, () => {
    console.log('Server started on port 3000');
});


