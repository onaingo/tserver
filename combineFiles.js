const fs = require('fs');
const path = require('path');

// Files and folders to ignore
const ignoredDirectories = ['node_modules', 'dist', '.git', 'public', 'images', 'videos'];
const ignoredFiles = ['package-lock.json', 'yarn.lock'];

const outputFile = 'compiled_code.txt';

// Helper function to get all files in a directory recursively
const getAllFiles = (dirPath, arrayOfFiles) => {
    const files = fs.readdirSync(dirPath);

    arrayOfFiles = arrayOfFiles || [];

    files.forEach(file => {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            if (!ignoredDirectories.includes(file)) {
                arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
            }
        } else {
            if (!ignoredFiles.includes(file) && !file.endsWith('.png') && !file.endsWith('.jpg') && !file.endsWith('.webp') && !file.endsWith('.mp4')) {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        }
    });

    return arrayOfFiles;
};

// Helper function to write the file structure
const writeFileStructure = (dirPath, prefix = '') => {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });

    entries.forEach(entry => {
        if (ignoredDirectories.includes(entry.name)) return;

        const fullPath = path.join(dirPath, entry.name);
        const isDirectory = entry.isDirectory();

        fs.appendFileSync(outputFile, `${prefix}${entry.name}${isDirectory ? '/' : ''}\n`);

        if (isDirectory) {
            writeFileStructure(fullPath, prefix + '  ');
        }
    });
};

// Function to combine all files into a single text file
const compileCode = () => {
    const rootPath = path.join(__dirname);
    const files = getAllFiles(rootPath);

    // Clear the output file
    fs.writeFileSync(outputFile, '');

    // Write the file structure
    fs.appendFileSync(outputFile, '==== FILE STRUCTURE ====\n');
    writeFileStructure(rootPath);
    fs.appendFileSync(outputFile, '\n==== CODE ====\n');

    // Combine all file contents
    files.forEach(file => {
        const fileContent = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(__dirname, file);

        fs.appendFileSync(outputFile, `\n==== START OF FILE: ${relativePath} ====\n`);
        fs.appendFileSync(outputFile, fileContent);
        fs.appendFileSync(outputFile, `\n==== END OF FILE: ${relativePath} ====\n`);
    });

    console.log(`All files have been compiled into ${outputFile}`);
};

compileCode();
