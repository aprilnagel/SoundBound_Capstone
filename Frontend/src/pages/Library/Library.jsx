import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import BookCard from "../../components/BookCard/BookCard";
import "./Library.css";

export default function Library() {
  const [library, setLibrary] = useState([]);
  const [user, setUser] = useState(null); // ⭐ NEW
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [sortOption, setSortOption] = useState("title");
  const [showAuthoredOnly, setShowAuthoredOnly] = useState(false); // ⭐ NEW

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
  // FILTER: Only show books authored by the logged-in author
  // ---------------------------------------------------------
  const filteredLibrary =
    showAuthoredOnly && user
      ? library.filter((book) => {
          const bookKeys =
            book.author_keys ||
            (book.author_key ? [book.author_key] : []) ||
            (book.openlib_author_key ? [book.openlib_author_key] : []);

          return bookKeys.some((key) => user.author_keys?.includes(key));
        })
      : library;

  // ---------------------------------------------------------
  // SORTING
  // ---------------------------------------------------------
  const sortedLibrary = [...filteredLibrary].sort((a, b) => {
    if (sortOption === "title") {
      const titleA = normalizeTitle(a.title);
      const titleB = normalizeTitle(b.title);
      return titleA.localeCompare(titleB);
    }
    return 0;
  });

  // ---------------------------------------------------------
  // FETCH USER LIBRARY + USER PROFILE
  // ---------------------------------------------------------
  useEffect(() => {
    async function fetchEverything() {
      try {
        // Fetch library
        const libRes = await fetch(
          "https://soundbound-capstone.onrender.com/users/me/library",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const libData = await libRes.json();

        if (!libRes.ok) {
          setError(libData.error || "Failed to load library");
        } else {
          setLibrary(libData.library || []);
        }

        // Fetch user profile (for author_keys)
        const userRes = await fetch(
          "https://soundbound-capstone.onrender.com/users/me",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const userData = await userRes.json();
        console.log("USER DATA FROM BACKEND:", userData);
        setUser(userData || null);
      } catch (err) {
        setError("Network error fetching data");
      } finally {
        setLoading(false);
      }
    }

    fetchEverything();
  }, []);

  // ---------------------------------------------------------
  // REMOVE BOOK FROM LIBRARY
  // ---------------------------------------------------------
  async function handleReturnBook(book) {
    try {
      const res = await fetch(
        "https://soundbound-capstone.onrender.com/users/me/library",
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({ book_id: book.id }),
        },
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to remove book");
        return;
      }

      setLibrary((prev) => prev.filter((b) => b.id !== book.id));
    } catch (err) {
      alert("Network error removing book");
    }
  }

  // ---------------------------------------------------------
  // RENDER STATES
  // ---------------------------------------------------------
  if (loading) return <p className="loading">Loading your library…</p>;
  if (error) return <p className="error">{error}</p>;

  return (
    <div className="library-page">
      <Navbar />

      <div className="library-container">
        <h1 className="library-title">My Library</h1>
        <div className="library-title-underline"></div>
        <p className="library-count">Books: {filteredLibrary.length}</p>

        {/* SORT */}
        <div className="library-controls">
          <div className="library-sort">
            <label>Sort by:</label>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
            >
              <option value="title">Title (A–Z)</option>
              <option value="title_desc">Title (Z–A)</option>
               <option value="author">Author (A–Z)</option>
              <option value="author_desc">Author (Z–A)</option>
            </select>
          </div>

          {user?.author_keys?.length > 0 && (
            <div className="library-filter">
              <label>
                <input
                  type="checkbox"
                  checked={showAuthoredOnly}
                  onChange={() => setShowAuthoredOnly(!showAuthoredOnly)}
                />
                My Books
              </label>
            </div>
          )}
        </div>

        {/* BOOK GRID */}
        <div className="library-grid">
          {sortedLibrary.length === 0 && (
            <p className="empty">No books found.</p>
          )}

          {sortedLibrary.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              canAuthorReco={book.can_author_reco}
              showLibraryActions={true}
              onCreatePlaylist={() =>
                navigate(`/create-playlist?book_id=${book.id}`, {
                  state: { book },
                })
              }
              onReturnBook={() => handleReturnBook(book)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
