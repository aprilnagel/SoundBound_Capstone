import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar/Navbar";
import BookCard from "../../components/BookCard/BookCard";
import "./BookSearch.css";
import { useNavigate, useNavigationType, useLocation } from "react-router-dom";

const API_URL = "https://soundbound-capstone.onrender.com";

const BookSearch = () => {
  const navigate = useNavigate();
  const navType = useNavigationType();
  const location = useLocation();

  // ------------------ STATE ------------------ //
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [year, setYear] = useState("");

  const [results, setResults] = useState([]);
  const [sortBy, setSortBy] = useState("relevance");
  const [searchMode, setSearchMode] = useState("normal"); // "normal" | "author-reco"

  // ------------------ REFRESH ON RETURN ------------------ //
  useEffect(() => {
    if (location.state?.refresh) {
      clearSearch();
    }
  }, [location.state]);

  useEffect(() => {
    if (location.state?.refresh) {
      navigate(location.pathname, { replace: true });
    }
  }, [location.state, navigate, location.pathname]);

  // ------------------ RESTORE SEARCH ON BACK NAV ------------------ //
  useEffect(() => {
    if (navType === "POP") {
      const savedResults = localStorage.getItem("bookSearchResults");
      const savedInputs = localStorage.getItem("bookSearchInputs");
      const savedSort = localStorage.getItem("bookSearchSort");
      const savedMode = localStorage.getItem("bookSearchMode");

      if (savedResults) setResults(JSON.parse(savedResults));
      if (savedSort) setSortBy(savedSort);
      if (savedMode) setSearchMode(savedMode);

      if (savedInputs) {
        const parsed = JSON.parse(savedInputs);
        setTitle(parsed.title || "");
        setAuthor(parsed.author || "");
        setYear(parsed.year || "");
        setIsbn(parsed.isbn || "");
      }
    } else {
      localStorage.removeItem("bookSearchResults");
      localStorage.removeItem("bookSearchInputs");
      localStorage.removeItem("bookSearchSort");
      localStorage.removeItem("bookSearchMode");
    }
  }, [navType]);

  // ------------------ UTIL ------------------ //
  const getLastName = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    return parts[parts.length - 1];
  };

  // ------------------ SORTING ------------------ //
  const sortedResults = [...results].sort((a, b) => {
    const authorA = a.authors?.[0] || "";
    const authorB = b.authors?.[0] || "";

    switch (sortBy) {
      case "title-asc":
        return a.title.localeCompare(b.title);
      case "title-desc":
        return b.title.localeCompare(a.title);
      case "author-asc":
        return getLastName(authorA).localeCompare(getLastName(authorB));
      case "author-desc":
        return getLastName(authorB).localeCompare(getLastName(authorA));
      case "year-desc":
        return (b.publish_year || 0) - (a.publish_year || 0);
      case "year-asc":
        return (a.publish_year || 0) - (b.publish_year || 0);
      default:
        return 0;
    }
  });

  // ------------------ NORMAL SEARCH ------------------ //
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchMode("normal");

    const params = new URLSearchParams();
    if (title) params.append("title", title);
    if (author) params.append("author", author);
    if (isbn) params.append("isbn", isbn);
    if (year) params.append("year", year);

    const res = await fetch(`${API_URL}/books/search?${params.toString()}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    const data = await res.json();
    const finalResults = Array.isArray(data) ? data : [];

    // Fetch enrich data
    const openlibIds = finalResults.map((b) => b.openlib_id);

    const enrichRes = await fetch(`${API_URL}/books/enrich`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({ openlib_ids: openlibIds }),
    });

    const enrichData = await enrichRes.json();

    // ⭐ FIXED MERGE — NEVER DROP PLAYLIST ID
    const merged = finalResults.map((book) => {
      const enriched = enrichData[book.openlib_id] || {};

      return {
        ...book,
        ...enriched,

        // ⭐ ALWAYS preserve playlist ID if it exists anywhere
        author_reco_playlist_id:
          enriched.author_reco_playlist_id ??
          book.author_reco_playlist_id ??
          book.author_reco_playlist?.id ??
          null,

        // ⭐ Normalize fields
        authors: book.authors || book.author_names || [],
        publish_year: book.publish_year || book.first_publish_year || null,
        cover_id: book.cover_id || null,
        cover_url: book.cover_url || null,
      };
    });

    setResults(merged);

    // Save search state
    localStorage.setItem("bookSearchResults", JSON.stringify(merged));
    localStorage.setItem(
      "bookSearchInputs",
      JSON.stringify({ title, author, year, isbn }),
    );
    localStorage.setItem("bookSearchSort", sortBy);
    localStorage.setItem("bookSearchMode", "normal");
  };

  // ------------------ AUTHOR RECO SEARCH ------------------ //
  const handleAuthorRecoSearch = async () => {
    setSearchMode("author-reco");

    setTitle("");
    setAuthor("");
    setYear("");
    setIsbn("");

    const res = await fetch(`${API_URL}/books/author-reco`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });

    const data = await res.json();

    // ⭐ FIXED NORMALIZATION — PRESERVE PLAYLIST ID
    const normalized = data.map((book) => ({
      ...book,

      author_reco_playlist_id:
        book.author_reco_playlist_id ?? book.author_reco_playlist?.id ?? null,

      authors: book.authors || book.author_names || [],
      publish_year: book.publish_year || book.first_publish_year || null,
      cover_id: book.cover_id || null,
      cover_url: book.cover_url || null,
    }));

    setResults(normalized);

    localStorage.setItem("bookSearchResults", JSON.stringify(normalized));
    localStorage.setItem("bookSearchInputs", JSON.stringify({}));
    localStorage.setItem("bookSearchSort", sortBy);
    localStorage.setItem("bookSearchMode", "author-reco");
  };

  // ------------------ CLEAR SEARCH ------------------ //
  const clearSearch = () => {
    setTitle("");
    setAuthor("");
    setYear("");
    setIsbn("");
    setResults([]);
    setSearchMode("normal");

    localStorage.removeItem("bookSearchResults");
    localStorage.removeItem("bookSearchInputs");
    localStorage.removeItem("bookSearchSort");
    localStorage.removeItem("bookSearchMode");
  };

  // ------------------ RENDER ------------------ //
  return (
    <div className="book-search-page">
      <Navbar />

      <div className="search-container">
        <h1 className="search-title">Books</h1>

        {/* SEARCH BAR */}
        <form
          className="search-bar"
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch(e);
          }}
        >
          <input
            type="text"
            placeholder="Title..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <input
            type="text"
            placeholder="Author..."
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          />

          <input
            type="text"
            placeholder="Year..."
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />

          <input
            type="text"
            placeholder="ISBN..."
            value={isbn}
            onChange={(e) => setIsbn(e.target.value)}
          />

          <button className="search-btn" type="submit">
            Search
          </button>
          <button className="clear-btn" type="button" onClick={clearSearch}>
            Clear
          </button>
        </form>

        {/* AUTHOR RECO TOGGLE */}
        <label className="author-reco-checkbox inline-with-form">
          <input
            type="checkbox"
            onChange={(e) => {
              e.stopPropagation();
              if (e.target.checked) handleAuthorRecoSearch();
              else clearSearch();
            }}
          />
          Show Author Reco Books
        </label>

        {/* RESULTS + SORTING */}
        {results.length > 0 && (
          <>
            <p className="results-count">{results.length} results found</p>

            <div className="sort-radios">
              {[
                ["relevance", "Relevance"],
                ["title-asc", "Title A–Z"],
                ["title-desc", "Title Z–A"],
                ["author-asc", "Author A–Z"],
                ["author-desc", "Author Z–A"],
                ["year-desc", "Newest"],
                ["year-asc", "Oldest"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="sortBy"
                    value={value}
                    checked={sortBy === value}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      localStorage.setItem("bookSearchSort", e.target.value);
                    }}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </>
        )}

        {/* RESULTS LABEL */}
        {results.length > 0 && (
          <p className="results-label">
            {searchMode === "author-reco" ? (
              <>Showing all books with Author Recommended Playlists</>
            ) : (
              <>
                Results for:
                {title && ` title="${title}"`}
                {author && ` author="${author}"`}
                {isbn && ` isbn="${isbn}"`}
                {year && ` year="${year}"`}
              </>
            )}
          </p>
        )}

        {/* RESULTS GRID */}
        <div className="results-grid">
          {sortedResults.map((book, index) => (
            <BookCard key={index} book={book} />
          ))}
        </div>

        {/* NO BOOK MESSAGE */}
        <div className="no-book-message">
          <p>
            Can’t find your book? You can still create a playlist!{" "}
            <span
              className="click-here"
              onClick={() => navigate("/create-playlist")}
            >
              click here!
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookSearch;
