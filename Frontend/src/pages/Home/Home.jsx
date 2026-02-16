import Navbar from "../../components/Navbar/Navbar";
import "./Home.css";
import { useContext, useEffect, useState } from "react";
import { AuthContext } from "../../contexts/Auth";
import HomeCard from "../../components/HomeCard/HomeCard";
import { useNavigate } from "react-router-dom";

import libraryImg from "../../Photos/6.png";
import playlistImg from "../../Photos/5.png";

export default function Home() {
  console.log("HOME COMPONENT RENDERED");

  const { user, token } = useContext(AuthContext);
  const navigate = useNavigate();

  // Only state we actually need now

  const [bookOfWeekCover, setBookOfWeekCover] = useState(null);
  const [bookOfDayId, setBookOfDayId] = useState(null);

  useEffect(() => {
    async function fetchBookOfDay() {
      const lastFetch = localStorage.getItem("bookOfDayTimestamp");
      const savedCover = localStorage.getItem("bookOfDayCover");
      const savedId = localStorage.getItem("bookOfDayId");

      const now = Date.now();
      const oneDay = 24 * 60 * 60 * 1000;

      // Reuse if within 24 hours
      if (
        lastFetch &&
        now - Number(lastFetch) < oneDay &&
        savedCover &&
        savedId
      ) {
        setBookOfWeekCover(savedCover);
        setBookOfDayId(savedId);
        return;
      }

      try {
        const res = await fetch(
          "https://openlibrary.org/subjects/fantasy.json?limit=50",
        );
        const data = await res.json();

        const random =
          data.works[Math.floor(Math.random() * data.works.length)];

        const coverId = random.cover_id;
        const olid = random.key; // "/works/OLxxxxW"
        const normalizedId = olid.split("/").pop(); // "OL262460W"


        const coverUrl = coverId
          ? `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`
          : "/fallback.png";

        // Save for 24 hours
        localStorage.setItem("bookOfDayCover", coverUrl);
        localStorage.setItem("bookOfDayId", normalizedId);
        localStorage.setItem("bookOfDayTimestamp", now.toString());

        setBookOfWeekCover(coverUrl);
        setBookOfDayId(normalizedId);
      } catch (err) {
        console.error("Failed to fetch Book of the Day:", err);
      }
    }

    fetchBookOfDay();
  }, []);

  return (
    <div className="home-page">
      <Navbar />

      <div className="home-content">
        <h1>Welcome to SoundBound{user?.name ? `, ${user.name}` : ""}!</h1>
        <p>Your gateway to books, music, and creativity.</p>

        <div className="home-card-grid">
          {/* LIBRARY CARD */}
          <HomeCard
            title="Your Library"
            image={libraryImg} // your custom image
            buttonText="Go to Library"
            onClick={() => navigate("/library")}
          />

          {/* PLAYLIST CARD */}
          <HomeCard
            title="Your Playlists"
            image={playlistImg} // your other custom image
            buttonText="Go to Playlists"
            onClick={() => navigate("/playlists")}
          />

          {/* BOOK OF THE WEEK */}
          <HomeCard
            title="Book of the Day"
            image={bookOfWeekCover}
            buttonText="Discover"
            onClick={() => navigate(`/book-details/${bookOfDayId}`)}
          />
        </div>
      </div>
    </div>
  );
}
