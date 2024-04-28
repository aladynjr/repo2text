
# repo2text

## Overview

`repo2text` extracts textual content from a specified GitHub repository, producing a compressed text file that provides the whole codebase context to ChatGPT.

## Features

- Filters out non-text files and certain directories (e.g., `node_modules`, `.git`).
- Produces a single text file summarizing the repository's textual content.

## Getting Started

### Prerequisites

Ensure you have Node.js installed on your system. You can download it from [Node.js official website](https://nodejs.org/).

### Installation

1. Clone this repository:
   ```
   git clone https://github.com/yourusername/repo2text.git
   ```
2. Navigate to the repository directory:
   ```
   cd repo2text
   ```
3. Install the necessary dependencies:
   ```
   npm install
   ```

### Configuration

Create a `.env` file in the root directory and set the following variable only if you are working with private repositories:
```
GITHUB_TOKEN=your_github_access_token_here
```
Generate a personal access token by following [these instructions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token).

### Usage

Start the server:
```
node repo2text.js
```
To extract text from a repository, make a GET request to `http://localhost:3000/repo?repoName=aladynjr/repo2txt`. Replace `aladynjr/repo2txt` with the GitHub repository name you want to process.

The server will process the repository and prompt you to download the resulting text file.

## Contribution

Contributions are welcome! Feel free to open an issue or submit a pull request.

## License

This project is licensed under the ISC License.
