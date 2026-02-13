import Navbar from "../../components/Navbar/Navbar";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import "./CreatePlaylist.css";

const API_URL = "https://soundbound-capstone.onrender.com";

export default function CreatePlaylist() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = localStorage.getItem("token");
  // ------------------ USER ROLE ------------------ //
  const user = JSON.parse(localStorage.getItem("user"));
  const currentUserRole = user?.role;

  // ------------------ MODE ------------------ //
  const bookId = searchParams.get("book_id");

  // ----------------MODE CHECK----------------//
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const playlistId = params.get("playlist_id");
  const isEditMode = Boolean(playlistId);
  const [saving, setSaving] = useState(false);

  // ------------------ STATE ------------------ //
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [customTitle, setCustomTitle] = useState("");
  const [customAuthor, setCustomAuthor] = useState("");
  const [customYear, setCustomYear] = useState("");

  const [isAuthorReco, setIsAuthorReco] = useState(false);

  const [songs, setSongs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const isCustomMode = !bookId && !isEditMode;

  //------------SEARCHES-----------------//
  const [searchTitle, setSearchTitle] = useState("");
  const [searchArtist, setSearchArtist] = useState("");
  const [searchAlbum, setSearchAlbum] = useState("");

  const [sortBy, setSortBy] = useState("");
  const [filter, setFilter] = useState("");

  //----------------POP UP----------------//
  const [showSaved, setShowSaved] = useState(false);

  // ------------------ LOAD BOOK ------------------ //
  async function loadBook() {
    try {
      const res = await fetch(`${API_URL}/books/id/${bookId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("Failed to fetch book");

      const data = await res.json();
      setBook(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load book:", err);
      navigate("/library");
    }
  }

  // ----------EFFECT (create/edit modes) -------------- //
  useEffect(() => {
    if (isEditMode) return; // do NOT load book in edit mode
    if (!bookId) return;

    loadBook();
  }, [bookId, isEditMode]);

  // ------------------ CUSTOM MODE: STOP LOADING ------------------ //
  useEffect(() => {
    if (isCustomMode) {
      setLoading(false);
    }
  }, [isCustomMode]);

  // ----------- LOAD PLAYLIST (EDIT MODE) -------------- //
  useEffect(() => {
    if (!isEditMode) return; // only run in edit mode
    if (!playlistId) return; // safety check
    if (!token) return; // wait for token

    async function fetchPlaylist() {
      try {
        const res = await fetch(`${API_URL}/playlists/${playlistId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("Failed to fetch playlist");

        const data = await res.json();
        console.log("PLAYLIST DATA:", data);

        // Prefill fields
        setTitle(data.title || "");
        setDescription(data.description || "");
        setSongs(
          (data.playlist_songs || []).map((ps) => ({
            id: ps.song.id, // use the real song id
            title: ps.song.title,
            artist: ps.song.artists,
            album: ps.song.album,
            spotify_id: ps.song.spotify_id,
          })),
        );

        setBook(data.books?.[0] || null);

        setLoading(false);
      } catch (err) {
        console.error("Failed to load playlist for editing:", err);
        setLoading(false);
      }
    }

    fetchPlaylist();
  }, [isEditMode, playlistId, token]);

  // ------------------ SONG SEARCH ------------------ //
  async function searchSongs(query) {
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_URL}/songs/spotify/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!res.ok) throw new Error("Spotify search failed");

      const data = await res.json();
      setSearchResults(data.tracks || []);
    } catch (err) {
      console.error("Spotify search failed:", err);
    }
  }

  // ⭐ AUTO-SEARCH EFFECT — PLACE IT RIGHT HERE ⭐
  useEffect(() => {
    const query = [searchTitle, searchArtist, searchAlbum]
      .filter(Boolean)
      .join(" ");

    if (query.length > 1) {
      searchSongs(query);
    } else {
      setSearchResults([]);
    }
  }, [searchTitle, searchArtist, searchAlbum]);

  // ---------------ADD / REMOVE SONGS -------------- //

  async function addSong(song) {
    // Prevent duplicates in UI
    if (songs.some((s) => s.id === song.id)) return;

    // Update UI immediately
    setSongs((prev) => [...prev, song]);

    // If editing, update playlist immediately
    if (isEditMode) {
      await fetch(`${API_URL}/playlists/${playlistId}/songs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ spotify_id: song.id }),
      });
    }
  }

  async function removeSong(songId) {
    // Update UI immediately
    setSongs((prev) => prev.filter((s) => s.id !== songId));

    // If editing, update playlist immediately
    if (isEditMode) {
      await fetch(`${API_URL}/playlists/${playlistId}/songs/${songId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  }

  // ------------------ SAVE PLAYLIST ------------------ //
  async function savePlaylist() {
    try {
      setSaving(true); // disable UI

      let payload; // ⭐ REQUIRED — declare before assigning

      // ------------------ CREATE MODE ------------------ //
      if (!isEditMode) {
        if (book?.in_user_library) {
          // Verified playlist
          payload = {
            title,
            description,
            book_id: book.id,
            is_author_reco: isAuthorReco,
          };
        } else {
          // Custom playlist
          payload = {
            title,
            description,
            custom_book_title: customTitle,
            custom_author_name: customAuthor,
            custom_publish_year: customYear || null,
          };
        }

        // ------------------ EDIT MODE ------------------ //
      } else {
        payload = {
          title,
          description,
        };

        // Only authors can toggle this field
        if (currentUserRole === "author") {
          payload.is_author_reco = isAuthorReco;
        }
      }

      const url = isEditMode
        ? `${API_URL}/playlists/${playlistId}`
        : `${API_URL}/playlists`;

      const method = isEditMode ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("SAVE ERROR RESPONSE:", errText);
        throw new Error("Failed to save playlist");
      }

      const playlist = await res.json();

      // ------------------ ADD SONGS (CREATE ONLY) ------------------ //
      if (!isEditMode) {
        for (const s of songs) {
          await fetch(`${API_URL}/playlists/${playlist.id}/songs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ spotify_id: s.id }),
          });
        }
      }

      setShowSaved(true);

      setTimeout(() => {
        setShowSaved(false);
        navigate(`/playlist-details/${playlist.id}`);
      }, 2000);
    } catch (err) {
      console.error("Failed to save playlist:", err);
    } finally {
      setSaving(false);
    }
  }

  const processedResults = [...searchResults]
    .filter((song) => {
      if (!filter) return true;
      const q = filter.toLowerCase();
      return (
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        song.album.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (!sortBy || sortBy === "relevance") return 0; // keep original order

      return (a[sortBy] || "").localeCompare(b[sortBy] || "");
    });

  // ------------------ RENDER ------------------ //
  if (loading) return <div>Loading...</div>;

  const isVerified = !isCustomMode && book?.in_user_library;
  const canAuthorReco = !isCustomMode && book?.is_owned_by_author;

  return (
    <div className="create-playlist-page">
      {" "}
      <Navbar />
      {/* ⭐ SAVED POPUP GOES RIGHT HERE ⭐ */}
      {showSaved && (
        <div className="success-popup">
          <div className="success-box">
            <div className="success-icon">✓</div>
            <h2>Playlist Saved!</h2>
          </div>
        </div>
      )}
      <div className="playlist-container">
        {/* ---------------- BOOK INFO + BOOK FIELDS ---------------- */}
        <div className="book-info-small">
          <div className="book-meta">
            <h3 className="playlist-heading">
              <span className="label">
                {isEditMode
                  ? "Editing playlist for:"
                  : "Creating playlist for:"}
              </span>
              <span className="book-title">
                {isCustomMode ? customTitle || "(Custom Book)" : book?.title}
              </span>
            </h3>

            <p className="in-library-flag">
              Verified: <span>{isVerified ? "Yes" : "No"}</span>
            </p>

            {/* Verified book → optional author reco */}
            {isVerified && canAuthorReco && (
              <label className="author-reco-toggle">
                <input
                  type="checkbox"
                  checked={isAuthorReco}
                  onChange={(e) => setIsAuthorReco(e.target.checked)}
                />
                Author Recommended
              </label>
            )}

            {/* Custom book → custom fields */}
            {isCustomMode && (
              <div className="custom-book-fields">
                <input
                  className="playlist-input"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder="Custom book title"
                />
                <input
                  className="playlist-input"
                  value={customAuthor}
                  onChange={(e) => setCustomAuthor(e.target.value)}
                  placeholder="Custom book author"
                />
                <input
                  className="playlist-input"
                  value={customYear}
                  onChange={(e) => setCustomYear(e.target.value)}
                  placeholder="Year (optional)"
                />
              </div>
            )}
          </div>
        </div>

        {/* ---------------- PLAYLIST TITLE ROW ---------------- */}
        <div className="playlist-input-row">
          <input
            className="playlist-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Playlist title"
          />

          <input
            className="playlist-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
          />

          <button className="save-btn" onClick={savePlaylist} disabled={saving}>
            {isEditMode ? "Save Playlist" : "Create Playlist"}
          </button>
        </div>

        {/* ---------------- SONG SEARCH & RESULTS ---------------- */}
        <div className="song-search-row">
          <input
            className="song-search-input"
            placeholder="Song title"
            value={searchTitle}
            onChange={(e) => setSearchTitle(e.target.value)}
          />

          <input
            className="song-search-input"
            placeholder="Artist"
            value={searchArtist}
            onChange={(e) => setSearchArtist(e.target.value)}
          />

          <input
            className="song-search-input"
            placeholder="Album"
            value={searchAlbum}
            onChange={(e) => setSearchAlbum(e.target.value)}
          />

          <button
            className="song-search-btn"
            onClick={() => {
              const query = [searchTitle, searchArtist, searchAlbum]
                .filter(Boolean)
                .join(" ");
              searchSongs(query);
            }}
          >
            Search Song
          </button>
        </div>

        <div className="song-columns">
          {/* LEFT SIDE: HEADER + RESULTS */}
          <div className="song-results-table">
            <div className="results-controls">
              <select
                className="results-sort"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="">Sort by…</option>
                <option value="relevance">Relevance</option>
                <option value="title">Title (A–Z)</option>
                <option value="artist">Artist (A–Z)</option>
                <option value="album">Album (A–Z)</option>
              </select>

              <input
                className="results-filter"
                placeholder="Filter by keyword"
                onChange={(e) => setFilter(e.target.value)}
              />
            </div>

            <div className="results-count">
              Results: {processedResults.length}
            </div>

            <div className="song-grid-header">
              <div>Song Title</div>
              <div>Artists</div>
              <div>Album</div>
              <div></div>
            </div>

            <div className="results">
              {processedResults.map((song) => (
                <div key={song.id} className="song-grid-row">
                  <div className="col-title">{song.title}</div>
                  <div className="col-artist">{song.artist}</div>
                  <div className="col-album">{song.album}</div>
                  <button
                    className="col-add"
                    onClick={() => !saving && addSong(song)}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT SIDE: PLAYLIST SONGS */}
          {songs.length > 0 && (
            <div className="current-songs">
              <h3>Playlist Songs</h3>

              {songs.map((song) => (
                <div key={song.id} className="song-row">
                  <div className="song-info">
                    <div className="song-title">{song.title}</div>
                    <div className="song-artist">{song.artist}</div>
                  </div>

                  <button
                    onClick={() => !saving && removeSong(song.id)}
                    disabled={saving}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
