/**
 * MCU Marathon Tracker - Main Application
 * Handles rendering, watched state, and stats.
 * Depends on: data.js (MCU_DATA, getMCUStats) and tmdb.js (fetchAllPosters, buildPosterElement)
 */

// ─── 1. WATCHED STATE ─────────────────────────────────────────
// We store watched movie IDs in localStorage as an array.
// e.g. ["iron-man", "thor", "the-avengers"]

function getWatchedIds() {
  const stored = localStorage.getItem("mcu_watched");
  return stored ? JSON.parse(stored) : []; // return empty array if nothing saved yet
}

function saveWatchedIds(ids) {
  localStorage.setItem("mcu_watched", JSON.stringify(ids));
}

function toggleWatched(movieId) {
  const watchedIds = getWatchedIds();
  const alreadyWatched = watchedIds.includes(movieId);

  const updated = alreadyWatched
    ? watchedIds.filter(id => id !== movieId)  // remove it
    : [...watchedIds, movieId];                // add it

  saveWatchedIds(updated);
  return updated;
}


// ─── 2. RENDER STATS BAR ──────────────────────────────────────
// Shows progress at the top of the page using getMCUStats from data.js

function renderStats(watchedIds) {
  const stats = getMCUStats(watchedIds);

  document.getElementById("stat-watched").textContent   = stats.watched;
  document.getElementById("stat-total").textContent     = stats.total;
  document.getElementById("stat-percent").textContent   = stats.percentage + "%";
  document.getElementById("stat-hours").textContent     = Math.round(stats.watchedRuntime / 60) + "h";
  document.getElementById("progress-bar").style.width   = stats.percentage + "%";
}


// ─── 3. BUILD ONE MOVIE CARD ──────────────────────────────────
// Takes a single MCU_DATA item + posterMap + watchedIds array.
// Returns a fully built <div> card element.

function buildCard(item, posterMap, watchedIds) {
  const isWatched = watchedIds.includes(item.id);

  // Create the card container
  const card = document.createElement("div");
  card.classList.add("card");
  card.dataset.id = item.id; // store the id on the element for easy access
  if (isWatched) card.classList.add("card--watched");

  // Poster image (from tmdb.js)
  const poster = buildPosterElement(posterMap[item.id], item.title);
  card.appendChild(poster);

  // Card body — title, meta info, watched button
  const body = document.createElement("div");
  body.classList.add("card-body");

  // Type badge (movie / series / special)
  const badge = document.createElement("span");
  badge.classList.add("card-badge", `card-badge--${item.type}`);
  badge.textContent = item.type;
  body.appendChild(badge);

  // Title
  const title = document.createElement("h3");
  title.classList.add("card-title");
  title.textContent = item.title;
  body.appendChild(title);

  // Runtime
  const meta = document.createElement("p");
  meta.classList.add("card-meta");
  const hours   = Math.floor(item.runtime / 60);
  const minutes = item.runtime % 60;
  meta.textContent = hours > 0
    ? `${hours}h ${minutes}m · IMDb ${item.ratingIMDb}`
    : `${minutes}m · IMDb ${item.ratingIMDb}`;
  body.appendChild(meta);

  // Watched toggle button
  const btn = document.createElement("button");
  btn.classList.add("card-btn");
  btn.textContent = isWatched ? "✓ Watched" : "Mark Watched";
  if (isWatched) btn.classList.add("card-btn--watched");

  // Click handler: toggle state, re-render stats, update this card only
  btn.addEventListener("click", function () {
    const updatedIds = toggleWatched(item.id);
    card.classList.toggle("card--watched");
    btn.classList.toggle("card-btn--watched");
    btn.textContent = updatedIds.includes(item.id) ? "✓ Watched" : "Mark Watched";
    renderStats(updatedIds); // update stats bar without re-rendering all cards
  });

  body.appendChild(btn);
  card.appendChild(body);

  return card;
}


// ─── 4. RENDER MOVIES GROUPED BY PHASE ────────────────────────
// Groups MCU_DATA by phase and builds a section for each.

function renderMovies(movies, posterMap) {
  movies.forEach(function(item) {
    const card = document.createElement("div");

    // This is the line that actually puts the image in
    const poster = buildPosterElement(posterMap[item.id], item.title);
    card.appendChild(poster);

    // ... rest of your card building
  });
}

  // Get unique phase numbers: [1, 2, 3, 4, 5]
  const phases = [...new Set(movies.map(item => item.phase))];

  phases.forEach(phase => {
    // Filter movies belonging to this phase
    const phaseMovies = movies.filter(item => item.phase === phase);

    // Create a section for the phase
    const section = document.createElement("section");
    section.classList.add("phase-section");

    // Phase heading
    const heading = document.createElement("h2");
    heading.classList.add("phase-heading");
    heading.textContent = `Phase ${phase}`;
    section.appendChild(heading);

    // Grid of cards
    const grid = document.createElement("div");
    grid.classList.add("cards-grid");

    phaseMovies.forEach(item => {
      const card = buildCard(item, posterMap, watchedIds);
      grid.appendChild(card);
    });

    section.appendChild(grid);
    container.appendChild(section);
  });

  // Render stats after cards are in the DOM
  renderStats(watchedIds);
}


// ─── 5. LOADING STATE ─────────────────────────────────────────
// Shows/hides a loading message while posters are being fetched.

function setLoading(isLoading) {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = isLoading ? "block" : "none";
}


// ─── 6. INIT — runs when the page loads ───────────────────────
// This is the entry point of the whole app.

async function init() {
  setLoading(true);

  try {
    // Fetch all 51 posters (or load from cache if already fetched)
    const posterMap = await fetchAllPosters();

    // Render everything
fetchAllPosters().then(function(posterMap) {
  renderMovies(MCU_DATA, posterMap);
});

  } catch (error) {
    console.error("Failed to initialise app:", error);
  } finally {
    setLoading(false);
  }
}

// Kick everything off once the HTML is fully parsed
document.addEventListener("DOMContentLoaded", init);
