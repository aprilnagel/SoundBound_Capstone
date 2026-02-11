import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import BookCard from "../../components/BookCard/BookCard";
import "./Library.css";

const Library = () => {
  const [library, setLibrary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const nav = useNavigate();

  // ---------------------------------------------------------
  // FETCH USER LIBRARY
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchLibrary = async () => {
      try {
        const res = await fetch(
          "https://soundbound-capstone.onrender.com/users/me/library",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );

        const data = await res.json();
        console.log("LIBRARY RESPONSE:", data);

        if (!res.ok) {
          setError(data.error || "Failed to load library");
        } else {
          setLibrary(data.library || []);
        }
      } catch (err) {
        setError("Network error fetching library");
      } finally {
        setLoading(false);
      }
    };

    fetchLibrary();
  }, []);

  // ---------------------------------------------------------
  // REMOVE BOOK FROM LIBRARY
  // ---------------------------------------------------------
  const handleReturnBook = async (book) => {
    try {
      const res = await fetch(
        `https://soundbound-capstone.onrender.com/users/me/library/${book.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      const data = await res.json();
      console.log("REMOVE BOOK RESPONSE:", data);

      if (!res.ok) {
        alert(data.error || "Failed to remove book");
        return;
      }

      // Update UI
      setLibrary((prev) => prev.filter((b) => b.id !== book.id));
    } catch (err) {
      alert("Network error removing book");
    }
  };

  // ---------------------------------------------------------
  // RENDER STATES
  // ---------------------------------------------------------
  if (loading) return <p className="loading">Loading your library…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="library-page">
      <Navbar />

      <div className="library-container">
        <h1 className="library-title">Library</h1>

        <div className="library-grid">
          {library.length === 0 && (
            <p className="empty">Your library is empty.</p>
          )}

          {library.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              showLibraryActions={true}
              onCreatePlaylist={() => nav(`/book-details/${book.openlib_id}`)}
              onReturnBook={() => handleReturnBook(book)}
            />
          ))}
        </div>

        <div className="access-roles">Access Roles: ALL</div>
      </div>
    </div>
  );
};

export default Library;