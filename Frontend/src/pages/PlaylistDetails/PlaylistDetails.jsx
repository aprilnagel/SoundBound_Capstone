import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./PlaylistDetails.css";
import Navbar from "../../components/Navbar/Navbar";
import fallbackCover from "../../Photos/2.png";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";

const API_URL = import.meta.env.VITE_API_URL;

export default function PlaylistDetails() {
  const { id } = useParams();
  const token = localStorage.getItem("token");
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Tag dropdown state
  const [allTags, setAllTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const [showDeletePopup, setShowDeletePopup] = useState(false);

  useEffect(() => {
    const fetchPlaylist = async () => {
      try {
        const res = await fetch(`${API_URL}/playlists/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to load playlist");
          setLoading(false);
          return;
        }

        setPlaylist(data);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Something went wrong");
        setLoading(false);
      }
    };

    const fetchTags = async () => {
      try {
        const res = await fetch(`${API_URL}/tags`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        setAllTags(data);
      } catch (err) {
        console.error("Failed to fetch tags", err);
      }
    };

    fetchPlaylist();
    fetchTags();
  }, [id, token]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) return <div className="pd-loading">Loading...</div>;
  if (error) return <div className="pd-error">{error}</div>;
  if (!playlist) return <div className="pd-loading">Loading...</div>;

  // ⭐ SAFE: compute after playlist loads
  const isAuthorClone = playlist.is_author_reco === true;

  const book = playlist.books?.[0];

  // Delete playlist handler
  const handleDeletePlaylist = async () => {
    try {
      const res = await fetch(`${API_URL}/playlists/${playlist.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data.error || "Failed to delete playlist");
        return;
      }

      setShowDeletePopup(false);
      navigate("/playlists");
    } catch (err) {
      console.error("Failed to delete playlist", err);
    }
  };

  // Add Tag handler (DISABLED for author clone)
  const handleAddTag = async () => {
    if (isAuthorClone) return; // safety
    if (!selectedTag) return;

    try {
      const res = await fetch(`${API_URL}/playlists/${id}/tags`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tag_id: selectedTag }),
      });

      const data = await res.json();

      if (res.ok) {
        setPlaylist(data);
        setSelectedTag("");
      } else {
        console.error("Error adding tag:", data.error);
      }
    } catch (err) {
      console.error("Failed to add tag", err);
    }
  };

  // Group tags by category
  const groupedTags = allTags.reduce((groups, tag) => {
    const category = tag.category || "uncategorized";
    if (!groups[category]) groups[category] = [];
    groups[category].push(tag);
    return groups;
  }, {});

  return (
    <div className="playlist-details-page">
      <Navbar />

      <div className="playlist-details-container">
        {/* HEADER — 3 COLUMNS */}
        <div className="playlist-header">
          {/* COLUMN 1 — COVER */}
          {book && (
            <img
              src={book.cover_url || fallbackCover}
              alt={book.title}
              className="playlist-cover"
            />
          )}

          {/* COLUMN 2 — TITLE + BOOK + ACTIONS */}
          <div className="playlist-info">
            <h1 className="playlist-title">
              
              {isAuthorClone && (
                <span className="pd-author-badge-label">
                  <BookmarkAddedIcon
                    sx={{
                      fontSize: 40,
                      color: "#a1d63e",
                      marginLeft: "-8px",
                      verticalAlign: "middle",
                    }}
                  />
                </span>
              )}
              {playlist.title}
            </h1>

            {book && <h2 className="playlist-book">Book: {book.title}</h2>}

            <div className="playlist-actions">
              {/* ⭐ HIDE EDIT BUTTON FOR AUTHOR CLONE */}
              {!isAuthorClone && (
                <button
                  className="edit-playlist-btn"
                  onClick={() =>
                    navigate(`/create-playlist?playlist_id=${playlist.id}`)
                  }
                >
                  Edit Playlist
                </button>
              )}

              {/* ⭐ DELETE ALWAYS ALLOWED */}
              <button
                className="delete-playlist-btn"
                onClick={() => setShowDeletePopup(true)}
              >
                {isAuthorClone ? "Remove from Library" : "Delete Playlist"}
              </button>

              {showDeletePopup && (
                <div className="popup-overlay">
                  <div className="popup">
                    <h3>Delete Playlist?</h3>
                    <p>This action cannot be undone.</p>

                    <div className="popup-buttons">
                      <button
                        className="confirm-delete"
                        onClick={handleDeletePlaylist}
                      >
                        Delete
                      </button>

                      <button
                        className="cancel-delete"
                        onClick={() => setShowDeletePopup(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3 — TAGS */}
          <div className="playlist-tags-col">
            <h3 className="tags-header">Tags</h3>

            <div className="tags-list">
              {playlist.tags.length === 0 && (
                <p className="empty-text">No tags yet.</p>
              )}

              {playlist.tags.map((tag) => (
                <span key={tag.id} className="tag-pill">
                  {tag.mood_name}
                </span>
              ))}
            </div>

            {/* ⭐ HIDE TAG CONTROLS FOR AUTHOR CLONE */}
            {!isAuthorClone && (
              <div className="tag-controls">
                <select
                  className="tag-select"
                  value={selectedTag}
                  onChange={(e) => setSelectedTag(e.target.value)}
                >
                  <option value="">Select a tag...</option>

                  {Object.entries(groupedTags).map(([category, tags]) => (
                    <optgroup key={category} label={category}>
                      {tags.map((tag) => (
                        <option key={tag.id} value={tag.id}>
                          {tag.mood_name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>

                <button className="add-tag-btn" onClick={handleAddTag}>
                  Add Tag
                </button>
              </div>
            )}
          </div>
        </div>

        {/* SONGS COLUMN */}
        <div className="playlist-columns">
          <section className="songs-column">
            <h2 className="section-title">
              Songs{" "}
              <span className="song-count">
                ({playlist.playlist_songs.length})
              </span>
            </h2>

            <div className="songs-list">
              {playlist.playlist_songs.length === 0 && (
                <p className="empty-text">No songs yet.</p>
              )}

              {playlist.playlist_songs.map((ps) => (
                <div key={ps.id} className="song-card">
                  <div className="song-info">
                    <span className="song-title">{ps.song.title}</span>
                    <span className="song-artists">
                      {ps.song.artists.join(", ")}
                    </span>
                  </div>

                  {/* ⭐ NO REMOVE BUTTON FOR AUTHOR CLONE */}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
