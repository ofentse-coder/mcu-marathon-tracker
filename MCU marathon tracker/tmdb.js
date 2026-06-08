/**
 * MCU Marathon Tracker - TMDB Poster Integration
 * Fetches and caches movie/series posters from The Movie Database API.
 */

// ─── 1. YOUR API KEY ──────────────────────────────────────────
//  Paste your TMDB API key (v3 auth) between the quotes below
const TMDB_KEY = "58ce714b7fc19a90bd186357a884b1c3";

// ─── 2. CONSTANTS ─────────────────────────────────────────────
const TMDB_BASE_URL  = "https://api.themoviedb.org/3";
const TMDB_IMAGE_URL = "https://image.tmdb.org/t/p/w500";
const CACHE_KEY      = "mcu_poster_cache"; // key used in localStorage

// ─── 3. SEARCH ENDPOINTS ──────────────────────────────────────
// Movies and TV series have different TMDB search endpoints.
// We pick the right one based on the `type` field in MCU_DATA.
function getSearchUrl(title,type) {
  const encoded = encodeURIComponent(title);

  if (type === "movie") {
    return `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_KEY}&query=${encoded}`;
  } else {
    // "series" and "special" both live under TV on TMDB
    return `${TMDB_BASE_URL}/search/tv?api_key=${TMDB_KEY}&query=${encoded}`;
  }
}

// ─── 4. FETCH A SINGLE POSTER ─────────────────────────────────
// Takes one MCU_DATA item, calls TMDB, returns the full image URL.
// Returns null if nothing is found or the request fails.
async function fetchOnePoster(item) {
  try {
    const url      = getSearchUrl(item.title, item.type);
    const response = await fetch(url);
    const data     = await response.json();

    // TMDB returns a `results` array. We grab the first match.
    const firstResult = data.results[0];

    if (!firstResult) return null;

    // Movies use `poster_path`; TV shows also use `poster_path`.
    const path = firstResult.poster_path;
    return path ? `${TMDB_IMAGE_URL}${path}` : null;

  } catch (error) {
    console.warn(`Could not fetch poster for "${item.title}":`, error);
    return null;
  }
}

// ─── 5. FETCH ALL POSTERS (with caching) ──────────────────────
// Main function you call once on page load.
// - First checks localStorage; if cached, returns instantly.
// - If not cached, fetches all 51 posters and saves to localStorage.
async function fetchAllPosters() {

  // --- Check cache first ---
  const cached = localStorage.getItem(CACHE_KEY);
  if (cached) {
    console.log("Posters loaded from cache ✓");
    return JSON.parse(cached); // returns { "iron-man": "https://...", ... }
  }

  console.log("Fetching posters from TMDB...");

  // --- Build an object: { movie_id: posterUrl } ---
  const posterMap = {};

  // We loop through every MCU title and fetch its poster.
  // `for...of` lets us use await inside the loop.
  for (const item of MCU_DATA) {
    const posterUrl = await fetchOnePoster(item);
    posterMap[item.id] = posterUrl; // will be null if not found

    // Small delay between requests to be kind to the TMDB API
    await delay(100);
  }

  // --- Save to localStorage so we never call the API again ---
  localStorage.setItem(CACHE_KEY, JSON.stringify(posterMap));
  console.log("All posters fetched and cached ✓");

  return posterMap;
}

// ─── 6. HELPER: small delay between API calls ─────────────────
// Returns a Promise that resolves after `ms` milliseconds.
// This is how you pause inside an async function.
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── 7. CLEAR CACHE (useful during development) ───────────────
// Call clearPosterCache() from the browser console if posters
// look wrong and you want to force a fresh fetch.
function clearPosterCache() {
  localStorage.removeItem(CACHE_KEY);
  console.log("Poster cache cleared. Refresh the page to re-fetch.");
}

// ─── 8. BUILD A POSTER IMG ELEMENT ────────────────────────────
// Takes a posterUrl (string or null) and the item title.
// Returns an <img> element, or a styled fallback <div>.
// Call this inside your renderMovies() function.
function buildPosterElement(posterUrl, title) {
  if (posterUrl) {
    const img = document.createElement("img");
    img.src   = posterUrl;
    img.alt   = `${title} poster`;
    img.classList.add("card-poster");

    // If the image fails to load, swap in a gradient fallback
    img.onerror = function () {
      this.replaceWith(buildFallback(title));
    };
    return img;

  } else {
    return buildFallback(title);
  }
}

// ─── 9. FALLBACK ELEMENT ──────────────────────────────────────
// Shown when there's no poster URL, using the coverGradient
// already defined on each item in MCU_DATA.
function buildFallback(title) {
  const div = document.createElement("div");
  div.classList.add("card-poster", "card-poster--fallback");
  div.textContent = title;
  return div;
}
