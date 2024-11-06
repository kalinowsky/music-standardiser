import * as fs from 'fs';
import * as path from 'path';

const colors = {
  RED: '\x1b[31m',
  GREEN: '\x1b[32m',
  YELLOW: '\x1b[33m',
  WHITE: '\x1b[37m',
  RESET: '\x1b[0m',
} as const;

// Helper function for colored logging
const log = (text: string, color: keyof typeof colors = 'WHITE') => {
  console.log(`${colors[color]}${text}${colors.RESET}`);
};

// Function to sanitize file names by removing special characters
const sanitizeFileName = (fileName: string): string => {
  return fileName
    .replace(/[\/:*?"<>|]/g, '')
    .replace(/ +/g, ' ')
    .trim();
};

const formatFileName = (fileName: string): string => {
  // Regex to match filenames with an optional leading number + period and an optional mix in parentheses
  fileName = fileName.replace(/_/g, ' '); // Replace underscores with spaces

  const regexFullInfo =
    /^(\d+\.?-?\s?)?(.*)-(.*?)( \(.*?\))?(\.mp3|\.wav|\.flac)$/i;
  const matchFullInfo = fileName.match(regexFullInfo);
  if (matchFullInfo) {
    // If the file starts with a number and a period (e.g., "01."), we remove it
    const artist = matchFullInfo[2]
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const title = matchFullInfo[3]
      .trim()
      .replace(/\b\w/g, (c) => c.toUpperCase());
    const mix = matchFullInfo[4] || ''; // Capture the mix version if it exists, otherwise leave empty
    const extension = (matchFullInfo[5] || '').toLowerCase(); // Normalize extension to lowercase
    // console.log({ match });
    return sanitizeFileName(
      artist && title
        ? `${artist} - ${title}${mix}${extension}`
        : `${artist || title}${mix}${extension}`
    );
  }

  const regexJustTitleOrArtist =
    /^(\d+\.?\s?)?\w*-?\w*(.*?)( \(.*?\))?(\.mp3|\.wav|\.flac)$/i;
  const matchJustTitleOrArist = fileName.match(regexJustTitleOrArtist);
  if (matchJustTitleOrArist) {
    // console.log('jest match', { matchJustTitleOrArist });
    console.log('matchJustTitleOrArist', fileName);
  }
  console.log('na wyjsciu', fileName);
  return ''; // Return empty string if no match is found
};

// Function to retrieve a list of music files from a folder
const getMusicFiles = (folderPath: string): string[] => {
  return fs
    .readdirSync(folderPath)
    .filter((file) => /\.(mp3|wav|flac)$/i.test(file));
};

// Function to list and propose file name changes
const listChanges = (
  folderPath: string,
  applyChanges: boolean = false
): void => {
  const files = getMusicFiles(folderPath);
  const proposedChanges: [string, string][] = [];
  const duplicateFiles: Set<string> = new Set();

  files.forEach((file) => {
    const oldPath = path.join(folderPath, file);
    const newFileName = formatFileName(file);
    const newPath = path.join(folderPath, newFileName);

    // Check if the file name already matches the desired format
    if (newFileName && file === newFileName) {
      log(`Correctly named: ${file}`, 'GREEN');
      return;
    }

    // If the name needs to be changed, add to the proposed changes
    if (newFileName && file !== newFileName) {
      proposedChanges.push([file, newFileName]);
      if (applyChanges) {
        fs.renameSync(oldPath, newPath);
        log(`Renamed: ${file} -> ${newFileName}`, 'YELLOW');
      } else {
        log(`Will rename: ${file} -> ${newFileName}`, 'YELLOW');
      }
    }

    // Check for duplicates
    const fileSize = fs.statSync(oldPath).size;
    const uniqueKey = `${newFileName}__${fileSize}`;
    if (duplicateFiles.has(uniqueKey)) {
      if (!applyChanges) {
        log(`Proposed duplicate for deletion: ${file}`, 'RED');
      } else {
        fs.unlinkSync(oldPath);
        log(`Deleted duplicate: ${file}`, 'RED');
      }
    } else {
      duplicateFiles.add(uniqueKey);
    }
  });

  if (!applyChanges && proposedChanges.length === 0) {
    log('No proposed changes.', 'WHITE');
  }
};

// Main function of the script
const main = () => {
  const args = process.argv.slice(2);
  const folderPath = args[0] ? path.resolve(args[0]) : path.resolve('./music'); // Path given as argument or default
  const applyChanges = args.includes('--change');

  if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
    log('Error: The specified path does not exist or is not a folder.', 'RED');
    return;
  }

  listChanges(folderPath, applyChanges);
};

main();
