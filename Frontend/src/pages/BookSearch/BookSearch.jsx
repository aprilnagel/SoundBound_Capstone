import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar/Navbar";
import BookCard from "../../components/BookCard/BookCard";
import "./BookSearch.css";
import { useNavigate, useNavigationType } from "react-router-dom";

const BookSearch = () => {
  const navigate = useNavigate();
  const navType = useNavigationType();

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [year, setYear] = useState("");
  const [results, setResults] = useState([]);
  const [sortBy, setSortBy] = useState("relevance");

  // ⭐ NEW: track whether user is doing normal search or author-reco search
  const [searchMode, setSearchMode] = useState("normal"); // "normal" | "author-reco"

  // Restore saved search on mount
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

  // Extract last name from "First Last"
  const getLastName = (name) => {
    if (!name) return "";
    const parts = name.trim().split(" ");
    return parts[parts.length - 1];
  };

  // SORTING LOGIC
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

  // SEARCH HANDLER
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchMode("normal");

    const params = new URLSearchParams();
    if (title) params.append("title", title);
    if (author) params.append("author", author);
    if (isbn) params.append("isbn", isbn);
    if (year) params.append("year", year);

    const res = await fetch(
      `https://soundbound-capstone.onrender.com/books/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    const data = await res.json();
    const finalResults = Array.isArray(data) ? data : [];

    setResults(finalResults);

    // Save results + inputs + sort + mode
    localStorage.setItem("bookSearchResults", JSON.stringify(finalResults));
    localStorage.setItem(
      "bookSearchInputs",
      JSON.stringify({ title, author, year, isbn }),
    );
    localStorage.setItem("bookSearchSort", sortBy);
    localStorage.setItem("bookSearchMode", "normal");
  };

  // CLEAR SEARCH
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

  const handleAuthorRecoSearch = async () => {
    setSearchMode("author-reco");

    setTitle("");
    setAuthor("");
    setYear("");
    setIsbn("");

    const res = await fetch(
      "https://soundbound-capstone.onrender.com/books/author-reco",
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    const data = await res.json();

    // ⭐ Normalize DB books to match OpenLibrary search shape
    const normalized = data.map((book) => ({
      ...book,
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

  return (
    <div className="book-search-page">
      <Navbar />

      <div className="search-container">
        <h1 className="search-title">Books</h1>

        {/* SEARCH BAR */}
        <form className="search-bar" onSubmit={handleSearch}>
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

          <button type="submit">Search</button>
          <button type="button" onClick={clearSearch}>
            Clear
          </button>
        </form>

        {/* ⭐ AUTHOR RECO BUTTON */}
        <button
          className="author-reco-btn inline-with-form"
          onClick={handleAuthorRecoSearch}
        >
          Show Author Reco Books
        </button>

        {/* RESULTS + RADIO SORTING */}
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
