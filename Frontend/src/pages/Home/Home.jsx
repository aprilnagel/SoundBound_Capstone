import Navbar from "../../components/Navbar/Navbar";
import "./Home.css";
import { useContext } from "react";
import { AuthContext } from "../../contexts/Auth";
import HomeCard from "../../components/HomeCard/HomeCard";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { API_BASE_URL } from "../../config";

export default function Home() {
    console.log("HOME COMPONENT RENDERED");
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [latestBook, setLatestBook] = useState(null);

  useEffect(() => {
    console.log("HOME USEEFFECT RAN")
    async function fetchLibrary() {
      try {
        const res = await fetch(`${API_BASE_URL}/users/me/library`, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include", // Include cookies for authentication
        });
        console.log("FETCH STATUS:", res.status);


        const data = await res.json();
        const books = data.library;

        if (books && books.length > 0) {
          setLatestBook(books[0]); // or books[books.length - 1]
          console.log("LATEST BOOK:", books[0]);
        }
      } catch (err) {
        console.error("Error fetching library:", err);
      }
    }

    fetchLibrary();
  }, []);

  return (
    <div className="home-page">
      <Navbar />

      <div className="home-content">
        <h1>Welcome to SoundBound{user?.name ? `, ${user.name}` : ""}!</h1>
        <p>Your gateway to books, music, and creativity.</p>

        {/* ⭐ New Home Cards Section */}
        <div className="home-card-grid">
          <HomeCard
            title="Your Library"
            description="Browse your saved books"
            image={latestBook?.cover_url}
            buttonText="Go to Library"
            onClick={() => navigate("/library")}
          />

          <HomeCard
            title="Your Library"
            description="Browse your saved books"
            buttonText="Go to Library"
            onClick={() => navigate("/library")}
          />

          <HomeCard
            title="Book of the Week"
            description="A fresh pick from Open Library"
            buttonText="Discover"
            onClick={() => navigate("/book-search")}
          />
        </div>
      </div>
    </div>
  );
}
