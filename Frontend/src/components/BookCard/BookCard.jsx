// src/components/BookCard/BookCard.jsx
import "./BookCard.css";

export default function BookCard({ book, onView }) {
  return (
    <div className="book-card">
      <div className="book-cover">
        <img src={book.cover} alt={book.title} />
      </div>

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        <p className="book-author">{book.author}</p>

        <button className="view-book-btn" onClick={() => onView(book)}>
          View Book
        </button>
      </div>
    </div>
  );
}