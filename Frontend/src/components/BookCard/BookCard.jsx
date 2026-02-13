import fallbackCover from "../../Photos/2.png";
import "./BookCard.css";
import { useNavigate } from "react-router-dom";

export default function BookCard({
  book,
  onView,
  showLibraryActions = false,
  onCreatePlaylist,
  onReturnBook,
}) {
  const navigate = useNavigate();

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
          <>
            <p className="book-author">{book.authors.join(", ")}</p>
            <p className="book-year">{book.publish_year}</p>
          </>
        )}

        {/* DEFAULT BUTTON (Search results) */}
        {!showLibraryActions && (
          <button
            className="view-book-btn"
            onClick={() => navigate(`/book-details/${book.openlib_id}`)}
          >
            View Book
          </button>
        )}

        {/* LIBRARY ACTIONS (Library page) */}
        {showLibraryActions && (
          <div className="library-actions">
            <button
              className="create-playlist-btn"
              onClick={() => {
                onCreatePlaylist(book);
                navigate(`/create-playlist?book_id=${book.id}`, {
                  state: { book },
                });
              }}
            >
              create playlist
            </button>

            <button
              className="return-book-btn"
              onClick={() => onReturnBook(book)}
            >
              return book
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
