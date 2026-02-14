import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import "./BookDetails.css";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";
import fallbackCover from "../../Photos/2.png";
import { useLocation } from "react-router-dom";

const BookDetails = () => {
  const { id } = useParams();
  const nav = useNavigate();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null); // "success" or "error"
  const location = useLocation();
  const passedYear = location.state?.publish_year;

  // ---------------------------------------------------------
  // FETCH BOOK DETAILS
  // ---------------------------------------------------------
  useEffect(() => {
    const fetchBook = async () => {
      try {
        const res = await fetch(
          `https://soundbound-capstone.onrender.com/books/${book?.openlib_id || id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        const data = await res.json();
        console.log("BOOK DETAILS RESPONSE:", data);

        if (!res.ok) {
          setError(data.error || "Failed to load book");
        } else {
          setBook(data);
        }
      } catch (err) {
        setError("Network error fetching book");
      } finally {
        setLoading(false);
      }
    };

    fetchBook();
  }, [id]);

  // ---------------------------------------------------------
  // ADD BOOK TO USER LIBRARY
  // ---------------------------------------------------------
  const handleCheckout = async () => {
    try {
      const cleanId = book.openlib_id || book.openlib_id?.split("/").pop();

      const res = await fetch(
        "https://soundbound-capstone.onrender.com/books/add-book",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            openlib_id: cleanId,
          }),
        },
      );

      const data = await res.json();
      console.log("ADD BOOK RESPONSE:", data);

      if (!res.ok) {
        setMessage(data.error || "Failed to add book");
        setMessageType("error");
        return;
      }

      setMessage("Book added to your library!");
      setMessageType("success");

      // Re-fetch the DB version of the book
      const refreshed = await fetch(
        `https://soundbound-capstone.onrender.com/books/${book.openlib_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      ).then((r) => r.json());

      setBook(refreshed);
    } catch (err) {
      setMessage("Network error adding book");
      setMessageType("error");
    }
  };

  // ---------------------------------------------------------
  // LOADING / ERROR STATES
  // ---------------------------------------------------------
  if (loading) return <p className="loading">Loading book…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!book) return <p>No book found.</p>;

  // ---------------------------------------------------------
  // ⭐ FIXED COVER LOGIC — MATCHES BOOKCARD EXACTLY ⭐
  // ---------------------------------------------------------
  const coverUrl = book.cover_id
    ? `https://covers.openlibrary.org/b/id/${book.cover_id}-L.jpg`
    : book.cover_url
      ? book.cover_url
      : book.cover_image
        ? book.cover_image
        : fallbackCover;

  // ---------------------------------------------------------
  // PAGE RENDER
  // ---------------------------------------------------------
  return (
    <div className="book-details-page">
      <Navbar />

      {/* NEW POPUP SYSTEM */}
      {message && (
        <div className="popup-overlay">
          <div className="popup-card">
            <div className={`popup-icon ${messageType}`}>
              {messageType === "success" ? "✓" : "✕"}
            </div>

            <h2>{message}</h2>

            <button className="close-btn" onClick={() => setMessage(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div className="details-container">
        <div className="details-3col">
          {/* LEFT COLUMN */}
          <div className="col left-col">
            <img
              src={coverUrl || book.cover_url || fallbackCover}
              alt={book.title}
              className="cover"
            />

            <button className="checkout-btn" onClick={handleCheckout}>
              Checkout Book
            </button>
          </div>

          {/* MIDDLE COLUMN */}
          <div className="col middle-col">
            <h1 className="title">
              {book.title}

              {book.author_reco_playlist && (
                <BookmarkAddedIcon className="author-bookmark-icon" />
              )}
            </h1>

            <p className="author">{book.author_names?.join(", ")}</p>

            <div className="meta-middle">
              <p>
                <strong>Genre:</strong> {book.subjects?.slice(0, 3).join(", ")}
              </p>
              <p>
                <strong>Publish Year:</strong>{" "}
                {passedYear || book.first_publish_year || "Unknown"}
              </p>

              <p>
                <strong>ISBNs:</strong> {book.isbn_list?.slice(0, 5).join(", ")}
                {book.isbn_list?.length > 5 && " …"}
              </p>
            </div>

            <div className="description-box">
              <p>{book.description || "No description available."}</p>
            </div>

            <div className="hidden-meta">
              <p>openlib_id: {book.openlib_id}</p>
              <p className="author_keys">
                Author Keys: {book.author_keys?.join(", ")}
              </p>
              <p>coverURL: {coverUrl}</p>
            </div>
          </div>

          {/* RIGHT COLUMN — ONLY IF PLAYLIST EXISTS */}
          {book.author_reco_playlist && (
            <div className="col right-col">
              <h2 className="playlist-title">Author Recommended Playlist</h2>

              <div className="playlist-box">
                {book.author_reco_playlist.songs.map((song, i) => (
                  <p key={i} className="song-item">
                    {song.title}
                  </p>
                ))}
              </div>

              <button className="listen-btn">Listen</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookDetails;
