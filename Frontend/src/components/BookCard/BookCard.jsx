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
    <div
      className="book-card"
      onClick={() => navigate(`/book-details/${book.openlib_id}`)}
    >
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

        {!showLibraryActions && (
          <button
            className="view-book-btn"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/book-details/${book.openlib_id}`, {
                state: { publish_year: book.publish_year },
              });
            }}
          >
            View Book
          </button>
        )}

        {showLibraryActions && (
          <div className="library-actions">
            <button
              className="create-playlist-btn"
              onClick={(e) => {
                e.stopPropagation();

                // ⭐ ONLY LIBRARY BOOKS HAVE A REAL DB ID
                // This prevents CreatePlaylist from receiving an OpenLibrary ID
                navigate(`/create-playlist?book_id=${book.id}`, {
                  state: { book },
                });
              }}
            >
              create playlist
            </button>

            <button
              className="return-book-btn"
              onClick={(e) => {
                e.stopPropagation();
                onReturnBook(book);
              }}
            >
              return book
            </button>
          </div>
        )}
      </div>
    </div>
  );
}