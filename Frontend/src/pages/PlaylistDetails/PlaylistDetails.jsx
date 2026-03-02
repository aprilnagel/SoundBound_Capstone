import React, { useEffect, useState, useRef, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./PlaylistDetails.css";
import Navbar from "../../components/Navbar/Navbar";
import fallbackCover from "../../Photos/2.png";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";
import { AuthContext } from "../../contexts/Auth";

const API_URL = import.meta.env.VITE_API_URL;

export default function PlaylistDetails() {
  const { id } = useParams();
  const { token, user } = useContext(AuthContext);   // ⭐ GET CURRENT USER HERE
  const navigate = useNavigate();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [allTags, setAllTags] = useState([]);
  const [selectedTag, setSelectedTag] = useState("");
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

  // close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // delete playlist
  const handleDeletePlaylist = async () => {
    try {
      const res = await fetch(`${API_URL}/playlists/${playlist.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
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

  // add tag
  const handleAddTag = async () => {
    if (!selectedTag) return;

    if (playlist.tags.some((t) => t.id === Number(selectedTag))) return;

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

  // remove tag
  const handleRemoveTag = async (tagId) => {
    try {
      const res = await fetch(`${API_URL}/playlists/${id}/tags/${tagId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok) {
        setPlaylist(data);
      } else {
        console.error("Error removing tag:", data.error);
      }
    } catch (err) {
      console.error("Failed to remove tag", err);
    }
  };

  if (loading) return <div className="pd-loading">Loading...</div>;
  if (error) return <div className="pd-error">{error}</div>;
  if (!playlist) return <div className="pd-loading">Loading...</div>;

  const book = playlist.books?.[0];

  // ⭐ CORRECT OWNER LOGIC
  const isOwner = playlist.user.id === user?.id;
  const isReadOnly = !isOwner;

  // group tags
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
        <div className="playlist-header">
          {book && (
            <img
              src={book.cover_url || fallbackCover}
              alt={book.title}
              className="playlist-cover"
            />
          )}

          <div className="playlist-info">
            {playlist.is_author_reco && (
              <BookmarkAddedIcon
                className="playlist-icon"
                style={{
                  color: "#a1d63e",
                  fontSize: "40px",
                  marginLeft: "-5px",
                }}
              />
            )}

            <h1 className="playlist-title">{playlist.title}</h1>

            {book && <h2 className="playlist-book">Book: {book.title}</h2>}

            {/* ⭐ ONLY AUTHOR SEES EDIT/DELETE */}
            {isOwner && (
              <div className="playlist-actions">
                <button
                  className="edit-playlist-btn"
                  onClick={() =>
                    navigate(`/create-playlist?playlist_id=${playlist.id}`)
                  }
                >
                  Edit Playlist
                </button>

                <button
                  className="delete-playlist-btn"
                  onClick={() => setShowDeletePopup(true)}
                >
                  Delete Playlist
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
            )}
          </div>

          <div className="playlist-tags-col">
            <h3 className="tags-header">Tags</h3>

            <div className="tags-list">
              {playlist.tags.length === 0 && (
                <p className="empty-text">No tags yet.</p>
              )}

              {playlist.tags.map((tag) => (
                <div key={tag.id} className="tag-pill">
                  {tag.mood_name}

                  {/* ⭐ ONLY AUTHOR CAN REMOVE TAGS */}
                  {isOwner && (
                    <button
                      className="remove-tag-btn"
                      onClick={() => handleRemoveTag(tag.id)}
                    >
                      x
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* ⭐ ONLY AUTHOR CAN ADD TAGS */}
            {isOwner && (
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

        <div className="playlist-columns">
          <section className="songs-column">
            <h2 className="section-title">
              Song Count:{" "}
              <span className="song-count">
                {playlist.playlist_songs.length}
              </span>
            </h2>

            <div className="song-header-row">
              <span className="header-col">Song Title</span>
              <span className="header-col">Artists</span>
              <span className="header-col">Album</span>
            </div>

            <div className="songs-list">
              {playlist.playlist_songs.length === 0 && (
                <p className="empty-text">No songs yet.</p>
              )}

              {playlist.playlist_songs.map((ps) => (
                <div key={ps.id} className="song-card">
                  <span className="song-col title-col">{ps.song.title}</span>
                  <span className="song-col artists-col">
                    {ps.song.artists.join(", ")}
                  </span>
                  <span className="song-col album-col">{ps.song.album}</span>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}