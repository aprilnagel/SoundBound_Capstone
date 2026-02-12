import { useState, useEffect } from "react";
import Navbar from "../../components/Navbar/Navbar";
import BookCard from "../../components/BookCard/BookCard";
import "./BookSearch.css";

const BookSearch = () => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [year, setYear] = useState("");
  const [results, setResults] = useState([]);
  const [sortBy, setSortBy] = useState("relevance");

  // Restore saved search on mount
  useEffect(() => {
    const savedResults = localStorage.getItem("bookSearchResults");
    const savedInputs = localStorage.getItem("bookSearchInputs");
    const savedSort = localStorage.getItem("bookSearchSort");

    if (savedResults) {
      setResults(JSON.parse(savedResults));
    }

    if (savedInputs) {
      const parsed = JSON.parse(savedInputs);
      setTitle(parsed.title || "");
      setAuthor(parsed.author || "");
      setYear(parsed.year || "");
      setIsbn(parsed.isbn || "");
    }

    if (savedSort) {
      setSortBy(savedSort);
    }
  }, []);

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
      }
    );

    const data = await res.json();
    console.log("SEARCH RESPONSE:", data);
    const finalResults = Array.isArray(data) ? data : [];

    setResults(finalResults);

    // Save results + inputs + sort
    localStorage.setItem("bookSearchResults", JSON.stringify(finalResults));
    localStorage.setItem(
      "bookSearchInputs",
      JSON.stringify({ title, author, year, isbn })
    );
    localStorage.setItem("bookSearchSort", sortBy);
  };

  // CLEAR SEARCH
  const clearSearch = () => {
    setTitle("");
    setAuthor("");
    setYear("");
    setIsbn("");
    setResults([]);

    localStorage.removeItem("bookSearchResults");
    localStorage.removeItem("bookSearchInputs");
    localStorage.removeItem("bookSearchSort");
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
            Results for:
            {title && ` title="${title}"`}
            {author && ` author="${author}"`}
            {isbn && ` isbn="${isbn}"`}
            {year && ` year="${year}"`}
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
            <span className="click-here">click here!</span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default BookSearch;