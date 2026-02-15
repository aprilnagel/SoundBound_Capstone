import fallbackCover from "../../Photos/2.png";
import "./BookCard.css";
import { useNavigate } from "react-router-dom";

export default function BookCard({
  book,
  showLibraryActions = false,
  onCreatePlaylist,
  onReturnBook,
}) {
  const navigate = useNavigate();

  // ⭐ Use backend field directly
  const canAuthorReco = book.can_author_reco;

  const coverUrl = book.cover_id
    ? `https://covers.openlibrary.org/b/id/${book.cover_id}-M.jpg`
    : book.cover_url || fallbackCover;

  return (
    <div
      className={`book-card ${showLibraryActions ? "in-library" : ""}`}
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

        {/* VIEW BOOK (non-library mode) */}
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

        {/* LIBRARY ACTIONS */}
        {showLibraryActions && (
          <div className="library-actions">
            {/* CREATE PERSONAL PLAYLIST */}
            {!book.user_playlist_id && (
              <button
                className="create-playlist-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/create-playlist?book_id=${book.id}`, {
                    state: { book },
                  });
                }}
              >
                create playlist
              </button>
            )}

            {/* VIEW PERSONAL PLAYLIST */}
            {book.user_playlist_id && (
              <button
                className="view-playlist-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/playlist-details/${book.user_playlist_id}`);
                }}
              >
                view playlist
              </button>
            )}

            {/* ⭐ AUTHOR RECO LOGIC */}
            {canAuthorReco && (
              <>
                {book.author_reco_playlist?.id ? (
                  <button
                    className="view-author-reco-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(
                        `/playlist-details/${book.author_reco_playlist.id}`,
                      );
                    }}
                  >
                    view author reco
                  </button>
                ) : (
                  <button
                    className="create-author-playlist-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/create-playlist?book_id=${book.id}`, {
                        state: { book },
                      });
                    }}
                  >
                    create author playlist
                  </button>
                )}
              </>
            )}

            {/* RETURN BOOK */}
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
