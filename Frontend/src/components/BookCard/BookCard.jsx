import fallbackCover from "../../Photos/2.png";

export default function BookCard({ book, onView }) {
  const coverUrl = book.cover_id
    ? `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`
    : fallbackCover;

  return (
    <div className="book-card">
      <div className="book-cover">
        <img src={coverUrl} alt={book.title} />
      </div>

      <div className="book-info">
        <h3 className="book-title">{book.title}</h3>
        {book.authors && (
          <p className="book-author">{book.authors.join(", ")}</p>
        )}

        <button className="view-book-btn" onClick={() => onView(book)}>
          View Book
        </button>
      </div>
    </div>
  );
}