import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import PlaylistCard from "../../components/PlaylistCard/PlaylistCard";
import "./Playlists.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function Playlists() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOption, setSortOption] = useState("book_title");

  // ---------------------------------------------------------
  // SMART TITLE SORT — ignores "The", "A", "An"
  // ---------------------------------------------------------
  function normalizeTitle(title) {
    if (!title) return "";
    let t = title.trim().toLowerCase();

    if (t.startsWith("the ")) return t.slice(4);
    if (t.startsWith("a ")) return t.slice(2);
    if (t.startsWith("an ")) return t.slice(3);

    return t;
  }

  // ---------------------------------------------------------
  // FETCH PLAYLISTS
  // ---------------------------------------------------------
  useEffect(() => {
    async function fetchPlaylists() {
      try {
        const res = await fetch(`${API_URL}/playlists/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setPlaylists(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load playlists:", err);
        setLoading(false);
      }
    }

    fetchPlaylists();
  }, [token]);

  // ---------------------------------------------------------
  // SORTING — BY BOOK TITLE
  // ---------------------------------------------------------
  const sortedPlaylists = [...playlists].sort((a, b) => {
    const bookA = normalizeTitle(a.books?.[0]?.title || "");
    const bookB = normalizeTitle(b.books?.[0]?.title || "");

    if (sortOption === "book_title") {
      return bookA.localeCompare(bookB);
    }
    if (sortOption === "book_title_desc") {
      return bookB.localeCompare(bookA);
    }
    if (sortOption === "songs") {
      return a.song_count - b.song_count;
    }
    if (sortOption === "songs_desc") {
      return b.song_count - a.song_count;
    }

    return 0;
  });

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  if (loading) return <div className="pd-loading">Loading...</div>;

  return (
    <div className="playlists-page">
      <Navbar />

      <div className="playlists-container">
        <h1 className="page-title">My Playlists</h1>
        <div className="library-title-underline"></div>
        <p className="playlist-count">Playlists: {playlists.length}</p>

        {/* SORT CONTROLS */}
        <div className="playlists-controls">
          <div className="playlists-sort">
            <label>Sort by:</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="book_title">Book Title (A–Z)</option>
              <option value="book_title_desc">Book Title (Z–A)</option>
              <option value="songs">Song Count (Low → High)</option>
              <option value="songs_desc">Song Count (High → Low)</option>
            </select>
          </div>
        </div>

        {/* PLAYLIST GRID */}
        <div className="playlists-grid">
          {sortedPlaylists.length === 0 && (
            <p className="empty-text">You haven't created any playlists yet.</p>
          )}

          {sortedPlaylists.map((pl) => (
            <PlaylistCard
              key={pl.id}
              playlist={pl}
              onClick={() => navigate(`/playlist-details/${pl.id}`)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}