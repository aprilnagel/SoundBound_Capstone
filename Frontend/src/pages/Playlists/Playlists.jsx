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

  useEffect(() => {
    async function fetchPlaylists() {
      try {
        const res = await fetch(`${API_URL}/playlists/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await res.json();
        console.log(playlists[0]);


        // Always an array now thanks to your backend fix
        setPlaylists(Array.isArray(data) ? data : []);
        setLoading(false);
      } catch (err) {
        console.error("Failed to load playlists:", err);
        setLoading(false);
      }
    }

    fetchPlaylists();
  }, [token]);

  if (loading) return <div className="pd-loading">Loading...</div>;

  return (
    <div className="playlists-page">
      <Navbar />

      <div className="playlists-container">
        <h1 className="page-title">Your Playlists</h1>

        <div className="playlists-grid">
            {playlists.length === 0 && (
            <p className="empty-text">You haven't created any playlists yet.</p>
            )}

            {playlists.map((pl) => (
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