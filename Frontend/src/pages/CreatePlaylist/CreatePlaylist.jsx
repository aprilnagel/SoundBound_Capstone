import Navbar from "../../components/Navbar/Navbar";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import "./CreatePlaylist.css";

export default function CreatePlaylist() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // ------------------ MODE ------------------ //
  const bookId = searchParams.get("book_id");

  // ------------------ STATE ------------------ //
  const [loading, setLoading] = useState(true);
  const [book, setBook] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [songs, setSongs] = useState([]);
  const [searchResults, setSearchResults] = useState([]);

  // ------------------ LOAD BOOK ------------------ //
  useEffect(() => {
    if (!bookId) {
      navigate("/library");
      return;
    }
    loadBook();
  }, []);

  async function loadBook() {
    try {
      const res = await fetch(`/books/${bookId}`);
      if (!res.ok) throw new Error("Failed to fetch book");

      const data = await res.json();
      setBook(data);
      setLoading(false);
    } catch (err) {
      console.error("Failed to load book:", err);
      navigate("/library");
    }
  }

  // ------------------ SONG SEARCH ------------------ //
  async function searchSongs(query) {
    if (!query) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await fetch(`/spotify/search?q=${encodeURIComponent(query)}`);
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
      const res = await fetch("/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          book_id: book.id,
        }),
      });

      if (!res.ok) throw new Error("Failed to create playlist");

      const playlist = await res.json();

      // Add songs
      for (const s of songs) {
        await fetch(`/songs/${playlist.id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ song: s }),
        });
      }

      navigate(`/playlist/${playlist.id}`);
    } catch (err) {
      console.error("Failed to create playlist:", err);
    }
  }

  // ------------------ RENDER ------------------ //
  if (loading) return <div>Loading...</div>;

  return (
    <div className="create-playlist-page">
      <Navbar />

      <div className="playlist-container">

        <div className="book-info-small">
          <div className="book-meta">
            <h3>{book.title}</h3>
            <p className="in-library-flag">
              In Library: <span>{book.in_user_library ? "Yes" : "No"}</span>
            </p>
          </div>
        </div>

        {/* ROW 1 — Playlist Inputs */}
        <div className="playlist-input-row">
          <div className="book-info-small">
            {book.cover_url && <img src={book.cover_url} alt={book.title} />}
            <div>
              <h3>{book.title}</h3>
              <p>{book.author_names?.join(", ")}</p>
            </div>
          </div>

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

        {/* ROW 2 — Song Search */}
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

        {/* ROW 3 — Results + Current Songs */}
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
