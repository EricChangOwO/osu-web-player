const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const app = express();
const PORT = 3000;

// Initialize database
const db = new Database('songs.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS songs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    artist TEXT,
    file_path TEXT UNIQUE,
    duration REAL,
    file_size INTEGER,
    beatmap_folder TEXT,
    last_modified INTEGER,
    created_at INTEGER DEFAULT (strftime('%s', 'now'))
  );

  CREATE INDEX IF NOT EXISTS idx_artist ON songs(artist);
  CREATE INDEX IF NOT EXISTS idx_title ON songs(title);
  CREATE INDEX IF NOT EXISTS idx_beatmap_folder ON songs(beatmap_folder);
`);

// CORS configuration for Cloudflare Tunnel
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range']
}));

app.use(express.json());
app.use(express.static('public'));

// Get all songs with pagination and search
app.get('/api/songs', (req, res) => {
  const { page = 1, limit = 50, search = '' } = req.query;
  const offset = (page - 1) * limit;

  let query = 'SELECT * FROM songs';
  let countQuery = 'SELECT COUNT(*) as total FROM songs';
  const params = [];

  if (search) {
    query += ' WHERE title LIKE ? OR artist LIKE ? OR beatmap_folder LIKE ?';
    countQuery += ' WHERE title LIKE ? OR artist LIKE ? OR beatmap_folder LIKE ?';
    const searchParam = `%${search}%`;
    params.push(searchParam, searchParam, searchParam);
  }

  query += ' ORDER BY artist, title LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));

  const songs = db.prepare(query).all(...params);
  const { total } = db.prepare(countQuery).get(search ? [`%${search}%`, `%${search}%`, `%${search}%`] : []);

  res.json({
    songs,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit)
  });
});

// Stream audio file
app.get('/api/stream/:id', (req, res) => {
  const song = db.prepare('SELECT * FROM songs WHERE id = ?').get(req.params.id);

  if (!song || !fs.existsSync(song.file_path)) {
    return res.status(404).json({ error: 'Song not found' });
  }

  const stat = fs.statSync(song.file_path);
  const range = req.headers.range;

  // Set CORS headers for streaming
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Range');
  res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = (end - start) + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'audio/mpeg',
      'Cache-Control': 'public, max-age=3600'
    });

    fs.createReadStream(song.file_path, { start, end }).pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': stat.size,
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600'
    });
    fs.createReadStream(song.file_path).pipe(res);
  }
});

// Get database stats
app.get('/api/stats', (req, res) => {
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_songs,
      COUNT(DISTINCT artist) as total_artists,
      COUNT(DISTINCT beatmap_folder) as total_beatmaps,
      SUM(file_size) as total_size
    FROM songs
  `).get();

  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`🎵 osu! Music Player running on http://localhost:${PORT}`);
  console.log(`📊 Database: songs.db`);
});
