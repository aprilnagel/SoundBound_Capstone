import Navbar from "../../components/Navbar/Navbar";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./CreatePlaylist.css";

export default function CreatePlaylist() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ------------------ MODE ------------------ //
  const bookId = searchParams.get("book_id");
  console.log("CREATE PLAYLIST - BOOK ID:", bookId);
  console.log("ACTIVE CREATE PLAYLIST FILE:", import.meta.url);

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

  //------------SEARCHES-----------------//
  const [searchTitle, setSearchTitle] = useState("");
  const [searchArtist, setSearchArtist] = useState("");
  const [searchAlbum, setSearchAlbum] = useState("");

  const [sortBy, setSortBy] = useState("");
  const [filter, setFilter] = useState("");

  // ------------------ LOAD BOOK ------------------ //
  async function loadBook() {
    try {
      console.log(
        "FETCHING:",
        `https://soundbound-capstone.onrender.com/books/id/${bookId}`,
      );

      const res = await fetch(
        `https://soundbound-capstone.onrender.com/books/id/${bookId}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      if (!res.ok) throw new Error("Failed to fetch book");

      const data = await res.json();
      setBook(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load book:", err);
      navigate("/library");
    }
  }

  // ------------------ EFFECT ------------------ //
  useEffect(() => {
    if (!bookId) return; // wait for router to populate it
    loadBook();
  }, [bookId]);

  // ------------------ SONG SEARCH ------------------ //
  async function searchSongs(query) {
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(
        `https://soundbound-capstone.onrender.com/songs/spotify/search?q=${encodeURIComponent(query)}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
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
  function addSong(song) {
    if (songs.some((s) => s.id === song.id)) return;
    setSongs((prev) => [...prev, song]);
  }

  function removeSong(songId) {
    setSongs((prev) => prev.filter((s) => s.id !== songId));
  }

  // ------------------ SAVE PLAYLIST ------------------ //
  async function savePlaylist() {
    try {
      let payload;

      if (book.in_user_library) {
        payload = {
          title,
          description,
          book_id: book.id,
          is_author_reco: isAuthorReco,
        };
      } else {
        payload = {
          title,
          description,
          custom_book_title: customTitle,
          custom_author_name: customAuthor,
          custom_publish_year: customYear || null,
        };
      }

      const res = await fetch(
        "https://soundbound-capstone.onrender.com/playlists",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!res.ok) throw new Error("Failed to create playlist");

      const playlist = await res.json();

      for (const s of songs) {
        await fetch(
          `https://soundbound-capstone.onrender.com/playlists/${playlist.id}/songs`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify({ song: s }),
          },
        );
      }

      navigate(`/playlist-details/${playlist.id}`);
    } catch (err) {
      console.error("Failed to create playlist:", err);
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

  const isVerified = book.in_user_library;
  const canAuthorReco = book.is_owned_by_author;

  return (
    <div className="create-playlist-page">
      <Navbar />

      <div className="playlist-container">
        {/* ---------------- BOOK INFO + BOOK FIELDS ---------------- */}
        <div className="book-info-small">
          <div className="book-meta">
            <h3 className="playlist-heading">
              <span className="label">Creating playlist for:</span>
              <span className="book-title">{book.title}</span>
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
            {!isVerified && (
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

          <button className="save-btn" onClick={savePlaylist}>
            Create Playlist
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
                  <button className="col-add" onClick={() => addSong(song)}>
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

                  <button onClick={() => removeSong(song.id)}>X</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
