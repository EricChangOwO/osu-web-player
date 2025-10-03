const API_URL = 'https://osumusic.0950405.xyz/api';

let songs = [];
let currentPage = 1;
let totalPages = 1;
let currentSongIndex = -1;
let searchTimeout = null;

// DOM Elements
const songList = document.getElementById('songList');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('search');
const audio = document.getElementById('audio');
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const nowPlaying = document.getElementById('nowPlaying');
const statsDiv = document.getElementById('stats');

// Initialize
async function init() {
  await loadStats();
  await loadSongs();

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      currentPage = 1;
      loadSongs();
    }, 300);
  });

  playBtn.addEventListener('click', togglePlay);
  prevBtn.addEventListener('click', playPrevious);
  nextBtn.addEventListener('click', playNext);

  audio.addEventListener('ended', playNext);
  audio.addEventListener('play', () => {
    playBtn.textContent = '⏸';
  });
  audio.addEventListener('pause', () => {
    playBtn.textContent = '▶';
  });
}

async function loadStats() {
  try {
    const response = await fetch(`${API_URL}/stats`);
    const stats = await response.json();
    // <button onclick="toggleSearch()">🔍</button>
    const sizeGB = (stats.total_size / 1024 / 1024 / 1024).toFixed(2);
    statsDiv.innerHTML = `
      <span>📀 <br> ${stats.total_songs} 歌曲</span>
      <span>🎤 <br> ${stats.total_artists} 藝術家</span>
      <span>🗺️ <br> ${stats.total_beatmaps} 譜面</span>
      <span>💾 <br> ${sizeGB} GB</span>
    `;
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

async function loadSongs(page = 1) {
  try {
    const search = searchInput.value;
    const response = await fetch(`${API_URL}/songs?page=${page}&limit=50&search=${encodeURIComponent(search)}`);
    const data = await response.json();

    songs = data.songs;
    currentPage = data.page;
    totalPages = data.totalPages;

    renderSongs();
    renderPagination();
  } catch (err) {
    console.error('Failed to load songs:', err);
    songList.innerHTML = '<div class="empty">無法載入歌曲</div>';
  }
}

function toggleSearch() {
  const search = document.querySelector('.search-bar');
  if (search.style.display === 'none') {
    search.style.display = 'block';
  } else {
    search.style.display = 'none';
  }
}

function renderSongs() {
  if (songs.length === 0) {
    songList.innerHTML = '<div class="empty">沒有找到歌曲</div>';
    return;
  }

  songList.innerHTML = songs.map((song, index) => `
    <div class="song-item" data-index="${index}" onclick="playSong(${index})">
      <div class="song-info">
        <div class="song-title">${escapeHtml(song.title)}</div>
        <div class="song-artist">${escapeHtml(song.artist)} - ${escapeHtml(song.beatmap_folder)}</div>
      </div>
      <div class="song-duration">${formatDuration(song.duration)}</div>
    </div>
  `).join('');
}

function renderPagination() {
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let buttons = '';

  if (currentPage > 1) {
    buttons += `<button onclick="loadSongs(${currentPage - 1})">上一頁</button>`;
  }

  buttons += `<span style="padding: 10px;">第 ${currentPage} / ${totalPages} 頁</span>`;

  if (currentPage < totalPages) {
    buttons += `<button onclick="loadSongs(${currentPage + 1})">下一頁</button>`;
  }

  pagination.innerHTML = buttons;
}

function playSong(index) {
  if (index < 0 || index >= songs.length) return;

  currentSongIndex = index;
  const song = songs[index];

  audio.src = `${API_URL}/stream/${song.id}`;
  audio.play();

  nowPlaying.innerHTML = `
    <div class="now-playing-title">${escapeHtml(song.title)}</div>
    <div class="now-playing-artist">${escapeHtml(song.artist)}</div>
  `;

  playBtn.disabled = false;
  prevBtn.disabled = index === 0;
  nextBtn.disabled = index === songs.length - 1;

  // Update UI
  document.querySelectorAll('.song-item').forEach((el, i) => {
    el.classList.toggle('active', i === index);
  });
}

function togglePlay() {
  if (audio.paused) {
    audio.play();
  } else {
    audio.pause();
  }
}

function playPrevious() {
  if (currentSongIndex > 0) {
    playSong(currentSongIndex - 1);
  }
}

function playNext() {
  if (currentSongIndex < songs.length - 1) {
    playSong(currentSongIndex + 1);
  } else if (currentPage < totalPages) {
    // Load next page and play first song
    loadSongs(currentPage + 1).then(() => {
      playSong(0);
    });
  }
}

function formatDuration(seconds) {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Start the app
init();
