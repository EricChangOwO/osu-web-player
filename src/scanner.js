const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const { parseFile } = require('music-metadata');

// Configuration
const OSU_SONGS_PATH = process.argv[2] || 'C:\\osu!\\Songs';

const db = new Database('songs.db');

// Prepare insert statement
const insertSong = db.prepare(`
  INSERT OR REPLACE INTO songs (title, artist, file_path, duration, file_size, beatmap_folder, last_modified)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

let scanned = 0;
let added = 0;
let errors = 0;

async function scanDirectory(dir) {
  try {
    const folders = fs.readdirSync(dir, { withFileTypes: true });
    const totalFolders = folders.filter(f => f.isDirectory()).length;
    let processedFolders = 0;

    for (const folder of folders) {
      if (!folder.isDirectory()) continue;

      const folderPath = path.join(dir, folder.name);
      processedFolders++;

      try {
        const files = fs.readdirSync(folderPath);
        const mp3Files = files.filter(f => f.toLowerCase().endsWith('.mp3'));

        for (const file of mp3Files) {
          const filePath = path.join(folderPath, file);
          await processSong(filePath, folder.name);
        }
      } catch (err) {
        console.error(`Error scanning folder ${folder.name}:`, err.message);
        errors++;
      }

      if (processedFolders % 10 === 0) {
        console.log(`Progress: ${processedFolders}/${totalFolders} folders (${added} songs added, ${errors} errors)`);
      }
    }
  } catch (err) {
    console.error('Error reading directory:', err.message);
    process.exit(1);
  }
}

async function processSong(filePath, beatmapFolder) {
  try {
    scanned++;
    const stats = fs.statSync(filePath);

    // Check if already indexed with same modification time
    const existing = db.prepare('SELECT last_modified FROM songs WHERE file_path = ?').get(filePath);
    if (existing && existing.last_modified === stats.mtimeMs) {
      return; // Skip if unchanged
    }

    // Parse metadata
    const metadata = await parseFile(filePath, { duration: true });
    const title = metadata.common.title || path.basename(filePath, '.mp3');
    const artist = metadata.common.artist || 'Unknown Artist';
    const duration = metadata.format.duration || 0;

    insertSong.run(
      title,
      artist,
      filePath,
      duration,
      stats.size,
      beatmapFolder,
      stats.mtimeMs
    );

    added++;
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
    errors++;
  }
}

async function main() {
  console.log('🎵 osu! Music Scanner');
  console.log('====================');
  console.log(`Scanning: ${OSU_SONGS_PATH}`);

  if (!fs.existsSync(OSU_SONGS_PATH)) {
    console.error(`❌ Directory not found: ${OSU_SONGS_PATH}`);
    console.log('\nUsage: npm run scan <path-to-osu-songs>');
    console.log('Example: npm run scan "C:\\osu!\\Songs"');
    process.exit(1);
  }

  const startTime = Date.now();

  await scanDirectory(OSU_SONGS_PATH);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n✅ Scan complete!');
  console.log(`📊 Stats:`);
  console.log(`   - Scanned: ${scanned} files`);
  console.log(`   - Added/Updated: ${added} songs`);
  console.log(`   - Errors: ${errors}`);
  console.log(`   - Time: ${elapsed}s`);

  db.close();
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
