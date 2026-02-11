import { useState } from "react";
import Navbar from "../../components/Navbar/Navbar";
import BookCard from "../../components/BookCard/BookCard";
import "./BookSearch.css";

const BookSearch = () => {
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [isbn, setIsbn] = useState("");
  const [year, setYear] = useState("");
  const [results, setResults] = useState([]);

  const handleSearch = async (e) => {
    e.preventDefault();

    const params = new URLSearchParams();

    if (title) params.append("title", title);
    if (author) params.append("author", author);
    if (isbn) params.append("isbn", isbn);
    if (year) params.append("year", year);
    const res = await fetch(
      `http://localhost:5000/books/search?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      }
    );

    const data = await res.json();
    setResults(data || []);
  };

  return (
    <div className="book-search-page">
      <Navbar />

      <div className="search-container">
      <h1 className="search-title">Books</h1>

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
          placeholder="ISBN..."
          value={isbn}
          onChange={(e) => setIsbn(e.target.value)}
        />

        <input
          type="text"
          placeholder="Year..."
          value={year}
          onChange={(e) => setYear(e.target.value)}
        />

        <button type="submit">Search</button>
      </form>

      <div className="results-section">
        {results.length > 0 && (
          <p className="results-label">
            Results for:
            {title && ` title="${title}"`}
            {author && ` author="${author}"`}
            {isbn && ` isbn="${isbn}"`}
            {year && ` year="${year}"`}
          </p>
        )}

        <div className="results-grid">
          {results.map((book, index) => (
            <BookCard key={index} book={book} onView={() => {}} />
          ))}
        </div>
      </div>

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