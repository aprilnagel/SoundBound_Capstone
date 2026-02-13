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
        `https://soundbound-capstone.onrender.com/spotify/search?q=${encodeURIComponent(query)}`,
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
          `https://soundbound-capstone.onrender.com/songs/${playlist.id}`,
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

      navigate(`/playlist/${playlist.id}`);
    } catch (err) {
      console.error("Failed to create playlist:", err);
    }
  }

  // ------------------ RENDER ------------------ //
  if (loading) return <div>Loading...</div>;

  const isVerified = book.in_user_library;
  const canAuthorReco = book.is_owned_by_author;

  return (
    <div className="create-playlist-page">
      <Navbar />

      <div className="playlist-container">
        <div className="book-info-small">
          <div className="book-meta">
            <h3>Creating playlist for: {book.title}</h3>
            <p className="in-library-flag">
              Verified: <span>{isVerified ? "Yes" : "No"}</span>
            </p>
          </div>
        </div>

        <div className="playlist-input-row">
          {isVerified && (
            <div className="verified-book-fields">
              {canAuthorReco && (
                <label className="author-reco-toggle">
                  <input
                    type="checkbox"
                    checked={isAuthorReco}
                    onChange={(e) => setIsAuthorReco(e.target.checked)}
                  />
                  Author Recommended
                </label>
              )}
            </div>
          )}

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

        <div className="song-search-row">
          <input
            className="song-search-input"
            placeholder="Song title"
            onChange={(e) => searchSongs(e.target.value)}
          />
          <input className="song-search-input" placeholder="Artist" />
          <input className="song-search-input" placeholder="Album" />

          <button
            className="song-search-btn"
            onClick={() =>
              searchSongs(document.querySelector(".song-search-input").value)
            }
          >
            Search Song
          </button>
        </div>

        <div className="song-columns">
          <div className="results">
            {searchResults.map((song) => (
              <div key={song.id} className="song-row">
                <span>{song.title}</span>
                <span>{song.artist}</span>
                <button onClick={() => addSong(song)}>Add</button>
              </div>
            ))}
          </div>

          {songs.length > 0 && (
            <div className="current-songs">
              <h3>Playlist Songs</h3>
              {songs.map((song) => (
                <div key={song.id} className="song-row">
                  <span>{song.title}</span>
                  <span>{song.artist}</span>
                  <button onClick={() => removeSong(song.id)}>Remove</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
