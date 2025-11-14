// Z-MOOSIC/scripts.js (FINAL WORKING CODE)

// ----------------------------------
// DATA ACCESS GUARD & PERSISTENCE CONFIG
// ----------------------------------
const LOCAL_STORAGE_KEY = 'zmoosic_playlist_recs';
const ZMOOSIC_CHART_KEY = 'zmoosic_global_charts';
const ZMOOSIC_LAST_DAILY_RESET_KEY = 'zmoosic_last_daily_reset';

// Ensure the global data object is accessible, assuming it is defined in data.js
if (typeof window.ZMOOSIC_PLAYLIST_DATA === 'undefined') {
    window.ZMOOSIC_PLAYLIST_DATA = {};
}

// Initialize global chart data structure
if (typeof window.ZMOOSIC_CHARTS_DATA === 'undefined') {
    window.ZMOOSIC_CHARTS_DATA = {
        daily: {},
        weekly: {}
    };
}

// ----------------------------------
// ADMIN CONFIGURATION
// ----------------------------------
const ADMIN_PASSWORD = "anisunvinpoopay"; // <<< SET YOUR PASSWORD HERE
// ----------------------------------


/**
 * Saves the current state of ZMOOSIC_PLAYLIST_DATA to Local Storage.
 */
function saveDataToLocalStorage() {
    try {
        const dataToSave = JSON.stringify(window.ZMOOSIC_PLAYLIST_DATA);
        localStorage.setItem(LOCAL_STORAGE_KEY, dataToSave);
        console.log("Playlist data saved to Local Storage.");
    } catch (e) {
        console.error("Error saving data to Local Storage:", e);
    }
}

/**
 * Function to save Global Chart Data
 */
function saveChartDataToLocalStorage() {
    try {
        const chartDataToSave = JSON.stringify(window.ZMOOSIC_CHARTS_DATA);
        localStorage.setItem(ZMOOSIC_CHART_KEY, chartDataToSave);
        console.log("Chart data saved to Local Storage.");
    } catch (e) {
        console.error("Error saving chart data:", e);
    }
}

/**
 * Loads saved data, including charts, and applies daily reset logic.
 */
function loadAndMergeData() {
    const savedData = localStorage.getItem(LOCAL_STORAGE_KEY);
    
    // 1. Playlist Data Loading and Merge (TEMPORARILY COMMENTED OUT to force data.js usage)
    /*
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            // In a real app, complex merge logic would live here
            Object.keys(parsedData).forEach(mood => {
                if (window.ZMOOSIC_PLAYLIST_DATA[mood]) {
                    // Simple overwrite for persistence, real merge is complex
                    window.ZMOOSIC_PLAYLIST_DATA[mood] = parsedData[mood];
                }
            });
            console.log("Playlist data loaded and merged from Local Storage.");
        } catch (e) {
            console.error("Error parsing saved data from Local Storage:", e);
        }
    }
    */ // <-- END OF COMMENT BLOCK. The app will now always use data.js content.
    
    // 2. Load Chart Data
    const savedChartData = localStorage.getItem(ZMOOSIC_CHART_KEY);
    if (savedChartData) {
        try {
            window.ZMOOSIC_CHARTS_DATA = JSON.parse(savedChartData);
            console.log("Global chart data loaded from Local Storage.");
        } catch (e) {
            console.error("Error parsing saved chart data:", e);
        }
    }

    // ----------------------------------
    // DAILY CHART RESET CHECK
    // ----------------------------------
    const lastResetString = localStorage.getItem(ZMOOSIC_LAST_DAILY_RESET_KEY);
    const today = new Date().toDateString(); 

    if (lastResetString !== today) {
        console.log("A new day has started! Resetting daily chart data.");
        
        window.ZMOOSIC_CHARTS_DATA.daily = {}; // Reset the Daily Chart Data
        localStorage.setItem(ZMOOSIC_LAST_DAILY_RESET_KEY, today); // Update the Last Reset Date
        
        saveChartDataToLocalStorage(); 
    }
    // ----------------------------------
}

// ----------------------------------
// 1. Sidebar Logic (Mood Pages)
// ----------------------------------
const sidebar = document.getElementById("sidebar");

function toggleSidebar() {
    if (sidebar) {
        sidebar.classList.toggle("open");
    }
}

document.addEventListener('click', (e) => {
    const header = document.querySelector('header h1');
    if (sidebar && sidebar.classList.contains("open") && !sidebar.contains(e.target) && e.target !== header) {
        sidebar.classList.remove("open");
    }
});


// ----------------------------------
// HELPER FUNCTIONS
// ----------------------------------

function getCurrentMood() {
    const path = window.location.pathname;
    const moodMatch = path.match(/moods\/(.+)\.html/);
    return moodMatch ? moodMatch[1] : null;
}

// 🔥 FIX: Robust Track ID Extraction and Playback Handler
function handlePlayLinkClick(event) {
    event.preventDefault();

    const link = event.currentTarget;
    const songLink = link.dataset.link;
    const playerContent = document.getElementById('player-content');
    
    const songItem = link.closest('.song-item');
    
    // CRITICAL FIX: Robust Track ID extraction, handles both web URL and URI
    // Reverted the regex to the original as requested, but the robust one is: songLink.match(/(?:track\/|track:)([a-zA-Z0-9]{22,})/);
    const trackIdMatch = songLink.match(/(?:track\/|track:)([a-zA-Z0-9]+)/);
    const trackId = trackIdMatch ? trackIdMatch[1] : null;

    if (trackId && songItem) {
        let sourceMoodKey = getCurrentMood(); 
        const songName = songItem.querySelector('.song-details strong')?.textContent || 'Unknown Song';
        const artist = songItem.querySelector('.song-details .artist-genre')?.textContent.split(' - ')[0].trim() || 'Unknown Artist';
        
        // CORRECTED EMBED SRC
        // NOTE: Keeping the user's non-standard URL structure with the trackId injection
        const embedSrc = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0&view=compact`;
        
        // TRACK THE PLAY EVENT (The function with the most important fix)
        trackSongPlay(trackId, songName, artist, sourceMoodKey, songLink); 

        // Iframe HTML for standard track player
        const playerHTML = `
            <iframe
                style="border-radius:12px"
                src="${embedSrc}"
                width="100%"
                height="80"
                frameborder="0"
                allowfullscreen=""
                allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                loading="lazy">
            </iframe>
        `;
        
        playerContent.innerHTML = playerHTML;
    } else {
        playerContent.innerHTML = '<p style="color:red; text-align: center;">Error: Invalid Spotify link found. Cannot extract Track ID.</p>';
    }
}

function setupSongCardListeners() {
    const playLinks = document.querySelectorAll('.song-item .play-link');
    
    playLinks.forEach(link => {
        link.removeEventListener('click', handlePlayLinkClick);
        link.addEventListener('click', handlePlayLinkClick);
    });
}


// 🔥 CRITICAL FIX: Function to track song play for the charts (Finalized Logic)
function trackSongPlay(trackId, name, artist, sourceMoodKey, songLink) {
    if (!trackId) return;

    // 1. DAILY CHART LOGIC
    // Access the existing entry using trackId as key, or initialize a new object
    const dailyEntry = window.ZMOOSIC_CHARTS_DATA.daily[trackId] || { 
        plays: 0, 
        name: name, 
        artist: artist, 
        sourceMood: sourceMoodKey,
        trackId: trackId, 
        link: songLink 
    };
    dailyEntry.plays += 1;
    window.ZMOOSIC_CHARTS_DATA.daily[trackId] = dailyEntry; // Ensure the updated object is stored

    // 2. WEEKLY CHART LOGIC
    // Access the existing entry using trackId as key, or initialize a new object
    const weeklyEntry = window.ZMOOSIC_CHARTS_DATA.weekly[trackId] || { 
        plays: 0, 
        name: name, 
        artist: artist, 
        sourceMood: sourceMoodKey,
        trackId: trackId, 
        link: songLink 
    };
    weeklyEntry.plays += 1;
    window.ZMOOSIC_CHARTS_DATA.weekly[trackId] = weeklyEntry; // Ensure the updated object is stored

    // 3. Persistence
    saveChartDataToLocalStorage();
    console.log(`Tracked play for ${name}. Daily: ${dailyEntry.plays}, Weekly: ${weeklyEntry.plays}`);
    
    // 4. Dynamic Chart Update
    const chartList = document.querySelector('#chart-list ul');
    if (chartList) {
        const chartType = chartList.getAttribute('data-source');
        if (chartType === 'charts/daily' || chartType === 'charts/weekly') {
            renderGlobalChart(); 
        }
    }
}


// ----------------------------------
// 2. Dynamic Playlist Rendering
// ----------------------------------

/**
 * Renders the curated playlist dynamically based on the current mood.
 */
function renderCuratedPlaylist() {
    const currentMood = getCurrentMood();
    const playlistContainer = document.querySelector('#curated-playlist ul');
    
    if (!currentMood || !playlistContainer || typeof ZMOOSIC_PLAYLIST_DATA === 'undefined') {
        return;
    }

    const fullPlaylist = ZMOOSIC_PLAYLIST_DATA[currentMood] || [];
    const curatedSongs = fullPlaylist.filter(song => !song.is_recommended);

    if (!curatedSongs || curatedSongs.length === 0) {
        playlistContainer.innerHTML = '<li>No curated songs available for this mood yet.</li>';
        return;
    }
    
    let playlistHTML = '';
    curatedSongs.forEach(song => {
        const finalCover = song.creator_cover ? song.creator_cover : song.default_cover;
        
        playlistHTML += `
            <li class="song-item" data-track-link="${song.link}">
                <img src="${finalCover}" alt="${song.name} Album Cover" class="album-cover">
                <div class="song-details">
                    <strong>${song.name}</strong>
                    <span class="artist-genre">${song.artist} - ${song.genre}</span>
                </div>
                <a href="#" class="play-link" data-link="${song.link}">
                    <img src="../assets/spotify_icon.png" alt="Spotify Icon" class="spotify-icon">
                    Play Now
                </a>
            </li>
        `;
    });

    playlistContainer.innerHTML = playlistHTML;
}


/**
 * Renders all user-recommended songs for the current mood.
 */
function renderRecommendedSongs() {
    const currentMood = getCurrentMood();
    const recSection = document.querySelector('#recommended-songs');
    let recList = recSection ? recSection.querySelector('ul') : null;

    if (!currentMood || typeof ZMOOSIC_PLAYLIST_DATA === 'undefined' || !recSection) {
        return;
    }

    if (!recList) {
        recList = document.createElement('ul');
        recSection.appendChild(recList);
        recList.className = 'recommended-list';
    }

    const fullPlaylist = ZMOOSIC_PLAYLIST_DATA[currentMood] || [];
    const recommendedSongs = fullPlaylist.filter(song => song.is_recommended);

    if (recommendedSongs.length === 0) {
        recList.innerHTML = `<li>No community recommendations for the mood yet.</li>`;
        return;
    }

    recommendedSongs.sort((a, b) => (b.recommend_count || 0) - (a.recommend_count || 0));

    let recHTML = '';
    recommendedSongs.forEach(song => {
        const finalCover = song.creator_cover || song.default_cover || 'placeholder-cover.jpg';
        
        recHTML += `
            <li class="song-item recommended-song" data-track-link="${song.link}">
                <img src="${finalCover}" alt="${song.name} Album Cover" class="album-cover">
                <div class="song-details">
                    <strong>${song.name}</strong>
                    <span class="artist-genre">${song.artist}</span>
                </div>
                <span class="recs-count">⭐ ${song.recommend_count || 1} Recs</span>
                <a href="#" class="play-link" data-link="${song.link}">
                    <img src="../assets/spotify_icon.png" alt="Spotify Icon" class="spotify-icon">
                    Play Now
                </a>
            </li>
        `;
    });
    
    recList.innerHTML = recHTML;
    
    setupSongCardListeners();
}


/**
 * Renders a Top Songs Chart by sorting recommendations for the current mood ONLY.
 */
function renderTopSongsChart() {
    const currentMoodKey = getCurrentMood();
    const chartSection = document.querySelector('#top-songs-chart');
    
    let chartList = chartSection ? chartSection.querySelector('ul') : null;
    
    if (!currentMoodKey || typeof ZMOOSIC_PLAYLIST_DATA === 'undefined' || !chartSection) {
        return;
    }
    
    if (!chartList) {
        chartList = document.createElement('ul');
        chartSection.appendChild(chartList);
    }
    
    const currentMoodPlaylist = ZMOOSIC_PLAYLIST_DATA[currentMoodKey] || [];
    const capitalizedMood = currentMoodKey.charAt(0).toUpperCase() + currentMoodKey.slice(1);

    if (currentMoodPlaylist.length === 0) {
        chartList.innerHTML = `<li>No songs in the ${capitalizedMood} playlist to generate a chart.</li>`;
        return;
    }
    
    let chartData = currentMoodPlaylist.map(song => ({
        name: song.name,
        artist: song.artist,
        recommendations: song.recommend_count || 0
    }));

    chartData.sort((a, b) => b.recommendations - a.recommendations);

    const top10Songs = chartData.slice(0, 10);

    let chartHTML = '';
    top10Songs.forEach((song, index) => {
        chartHTML += `
            <li class="chart-item">
                <span class="rank">#${index + 1}</span>
                <span class="title">${song.name} - ${song.artist}</span>
                <span class="recs">${song.recommendations} Recs</span>
            </li>
        `;
    });

    chartList.innerHTML = chartHTML;
    chartSection.querySelector('h2').textContent = `Top 10 ${capitalizedMood} Chart 📊`;
    chartSection.querySelector('p').textContent = `The most recommended songs in the ${capitalizedMood} playlist.`;
}

// 🔥 Function to render the Daily/Weekly Global Chart
function renderGlobalChart() {
    const chartList = document.querySelector('#chart-list ul');
    if (!chartList) return;
    
    const chartType = chartList.getAttribute('data-source'); 
    const chartKey = chartType.split('/')[1]; 

    if (!window.ZMOOSIC_CHARTS_DATA[chartKey]) return;

    let chartDataArray = Object.values(window.ZMOOSIC_CHARTS_DATA[chartKey]);
    
    // Sort by play count (highest first)
    chartDataArray.sort((a, b) => b.plays - a.plays);

    const top50Chart = chartDataArray.slice(0, 50);

    let chartHTML = top50Chart.map((song, index) => {
        const sourcePlaylistName = song.sourceMood ? 
            song.sourceMood.charAt(0).toUpperCase() + song.sourceMood.slice(1) : 
            'Unknown Playlist';
            
        // Use the stored link for the play button
        const trackLink = song.link || `spotify:track:${song.trackId}`; 

        return `
            <li class="song-item chart-item" data-track-link="${trackLink}">
                <span class="rank">#${index + 1}</span>
                <div class="song-details">
                    <strong>${song.name}</strong>
                    <span class="artist-genre">${song.artist}</span>
                    <span class="source-playlist">Source: ${sourcePlaylistName}</span>
                </div>
                <span class="play-count">${song.plays} Plays</span>
                <a href="#" class="play-link" data-link="${trackLink}">▶️ Play</a>
            </li>
        `;
    }).join('');

    if (top50Chart.length === 0) {
        chartHTML = `<li>No songs have been played yet for the ${chartKey} chart. Start listening!</li>`;
    }

    chartList.innerHTML = chartHTML;
    setupSongCardListeners(); 
}



// ----------------------------------
// 3. Recommendation Form Submission Logic
// ----------------------------------

function handleSubmitRecommendation(event) {
    const form = document.getElementById('recommendation-form');
    if (!form) return;
    
    event.preventDefault();

    const songName = document.getElementById('song-name').value.trim();
    const artist = document.getElementById('artist-name').value.trim();
    const songLink = document.getElementById('song-link').value.trim();
    const mood = document.getElementById('mood-selection').value.toLowerCase();
    const coverLink = document.getElementById('cover-link').value.trim() || '';
    const userAlias = document.getElementById('user-alias').value.trim() || 'Anonymous Fan';

    if (songName === "" || artist === "" || mood === "" || songLink === "") {
        alert("Please ensure you fill out the Song Name, Artist, Spotify/YouTube Link, and Mood.");
        return;
    }
    
    if (!ZMOOSIC_PLAYLIST_DATA[mood]) {
        ZMOOSIC_PLAYLIST_DATA[mood] = [];
    }

    // --- DUPLICATE CHECK AND INCREMENT LOGIC ---
    const currentMoodPlaylist = ZMOOSIC_PLAYLIST_DATA[mood];
    
    const normalizedName = songName.toLowerCase();
    const normalizedArtist = artist.toLowerCase();

    const existingSong = currentMoodPlaylist.find(song =>
        song.name.toLowerCase() === normalizedName &&
        song.artist.toLowerCase() === normalizedArtist
    );

    if (existingSong) {
        existingSong.recommend_count = (existingSong.recommend_count || 0) + 1;
        existingSong.is_recommended = true;
        
        alert(`Thank you! The song "${existingSong.name}" already exists in the ${mood} playlist. Its recommendation count has been updated to ${existingSong.recommend_count}.`);
        form.reset();
        
        saveDataToLocalStorage();

        renderRecommendedSongs();
        return;
    }
    // --- END DUPLICATE CHECK ---

    // NEW SONG: Create the song object and add it to the data
    const newSong = {
        name: songName,
        artist: artist,
        link: songLink,
        is_recommended: true,
        recommend_count: 1,
        creator_alias: userAlias,
        creator_cover: coverLink,
        genre: 'Community Pick',
        default_cover: '../assets/default_cover.png',
    };

    currentMoodPlaylist.push(newSong);

    alert(`Success! The recommendation "${songName}" by ${artist} for the ${mood} playlist has been added!`);
    form.reset();
    
    saveDataToLocalStorage();

    renderRecommendedSongs();
}

// ----------------------------------
// 4. ADMIN CONTROL FUNCTIONS
// ----------------------------------

/**
 * Handles the actual Admin state change and DOM updates.
 */
function toggleAdminState(newAdminState) {
    const adminToggleBtn = document.getElementById('admin-toggle');
    const adminControlsSection = document.getElementById('admin-controls-section');
    const adminSeparator = document.getElementById('admin-separator');
    const resetRecsBtn = document.getElementById('reset-recs-btn'); // Added Reset button
    const recommendationsSection = document.getElementById("recommended-songs");
    const topSongsChart = document.getElementById("top-songs-chart");

    if (adminToggleBtn) adminToggleBtn.textContent = newAdminState ? 'Admin: ON' : 'Admin: OFF';
    
    // Toggle visibility of Admin controls in the sidebar
    if (adminSeparator) adminSeparator.classList.toggle('hidden-control', !newAdminState);
    if (adminControlsSection) adminControlsSection.classList.toggle('hidden-control', !newAdminState);
    if (resetRecsBtn) resetRecsBtn.classList.toggle('hidden-control', !newAdminState); // Toggle reset button

    localStorage.setItem('isAdminActive', newAdminState);

    // Toggle visibility of Admin-only page sections
    const displayState = newAdminState ? "block" : "none";
    
    if (recommendationsSection) {
        recommendationsSection.style.display = displayState;
    }
    if (topSongsChart) {
        topSongsChart.style.display = displayState;
    }
}

/**
 * Clears all user-recommended songs, resets recommendation counts, and clears global play charts.
 */
function resetRecommendedSongs() {
    const confirmation = confirm("WARNING: This will clear ALL community recommendations, recommendation counts, AND **GLOBAL PLAY CHART DATA** for ALL moods. Are you sure you want to reset the weekly data?");
    
    if (!confirmation) {
        alert("Recommendation and Chart reset cancelled.");
        return;
    }

    // 1. Reset Playlist Recommendation Data
    Object.keys(window.ZMOOSIC_PLAYLIST_DATA).forEach(mood => {
        let currentPlaylist = window.ZMOOSIC_PLAYLIST_DATA[mood];
        
        const curatedSongsOnly = currentPlaylist.filter(song => !song.is_recommended);
        
        curatedSongsOnly.forEach(song => {
            // Reset relevant fields for curated songs that were previously recommended
            song.recommendation_count = 0;
            delete song.is_recommended;
            delete song.creator_alias;
        });

        window.ZMOOSIC_PLAYLIST_DATA[mood] = curatedSongsOnly;
    });

    // 2. Reset Global Chart Data
    window.ZMOOSIC_CHARTS_DATA.daily = {};
    window.ZMOOSIC_CHARTS_DATA.weekly = {};
    // Set the daily reset key to today to prevent immediate re-reset on load
    localStorage.setItem(ZMOOSIC_LAST_DAILY_RESET_KEY, new Date().toDateString()); 


    // 3. Save the cleared data
    saveDataToLocalStorage();
    saveChartDataToLocalStorage();
    
    // 4. Re-render the pages
    renderCuratedPlaylist();
    renderRecommendedSongs();
    renderTopSongsChart();
    renderGlobalChart(); 
    setupSongCardListeners();

    alert("✅ Weekly recommendation data and Global Charts have been successfully cleared for all moods.");
}


// ----------------------------------
// 5. DOM Content Loaded (Execution Entry Point)
// ----------------------------------
document.addEventListener('DOMContentLoaded', () => {

    // --- Persistence Management: Load data FIRST (This runs the Daily Reset Check) ---
    loadAndMergeData(); 

    const adminToggleBtn = document.getElementById('admin-toggle');
    const adminControlsSection = document.getElementById('admin-controls-section');
    const adminSeparator = document.getElementById('admin-separator');
    const submenuListItems = document.querySelectorAll('#sidebar nav ul li');

    const recommendationsSection = document.getElementById("recommended-songs");
    const topSongsChart = document.getElementById("top-songs-chart");
    const resetRecsBtn = document.getElementById('reset-recs-btn'); // Get reset button here

    const isAdminActive = localStorage.getItem('isAdminActive') === 'true';

    // A. Apply initial Admin State based on persistence
    if (isAdminActive) {
        // Toggle the state without requiring a password prompt if session is active
        toggleAdminState(true); 
    }


    // B. Admin Access/Toggle Logic 
    if (adminToggleBtn) {
        adminToggleBtn.addEventListener('click', () => {
            const wasAdminActive = localStorage.getItem('isAdminActive') === 'true';
            
            if (!wasAdminActive) {
                // Only prompt for password if turning ON
                const enteredPassword = prompt("Enter the Admin password to enable creator controls:");

                if (enteredPassword === ADMIN_PASSWORD) {
                    toggleAdminState(true);
                } else if (enteredPassword !== null) {
                    alert("Incorrect password. Admin controls remain disabled.");
                }
            } else {
                // If currently active, turn OFF without prompt
                toggleAdminState(false);
            }
        });
    }
    
    // ATTACH LISTENER FOR RESET BUTTON
    if (resetRecsBtn) {
        resetRecsBtn.addEventListener('click', resetRecommendedSongs);
        // Visibility is handled by toggleAdminState
    }

    // C. Submenu Click Toggle Logic
    submenuListItems.forEach(menuItem => {
        const link = menuItem.querySelector('a');
        const submenu = menuItem.querySelector('.submenu');

        if (submenu && link && link.getAttribute('href') === '#') {
            link.addEventListener('click', (event) => {
                event.preventDefault();
                
                menuItem.classList.toggle('open');
                
                if (menuItem.classList.contains('open')) {
                    // Set max-height to scroll height for smooth open animation
                    submenu.style.maxHeight = submenu.scrollHeight + "px";
                } else {
                    // Collapse by setting max-height back to 0
                    submenu.style.maxHeight = '0';
                }

                // Close other open submenus
                submenuListItems.forEach(otherItem => {
                    if (otherItem !== menuItem && otherItem.classList.contains('open')) {
                        otherItem.classList.remove('open');
                        otherItem.querySelector('.submenu').style.maxHeight = '0';
                    }
                });
            });
        }
    });


    // Initial Rendering (Run AFTER loading persistence)
    renderCuratedPlaylist();
    renderRecommendedSongs();
    renderTopSongsChart();
    
    // CRITICAL: Check for chart pages and render the global chart
    const chartList = document.querySelector('#chart-list ul');
    if (chartList && (chartList.getAttribute('data-source') === 'charts/daily' || chartList.getAttribute('data-source') === 'charts/weekly')) {
        renderGlobalChart(); 
    }
    
    setupSongCardListeners();

    // Form Submission Logic (Attach listener)
    const recommendationForm = document.getElementById('recommendation-form');
    if (recommendationForm) {
        recommendationForm.addEventListener('submit', handleSubmitRecommendation);
    }
});