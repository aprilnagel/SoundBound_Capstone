import fallbackCover from "../../Photos/2.png";
import "./PlaylistCard.css";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";

export default function PlaylistCard({ playlist, onClick }) {
  const book = playlist.books?.[0];
  const cover = book?.cover_url || fallbackCover;

  return (
    <div className="playlist-card" onClick={onClick}>
      
      {/* ⭐ Cover wrapper so badge can float on top */}
      <div className="playlist-cover-wrapper">
        {playlist.is_author_reco && (
          <div className="playlist-badge">
            <BookmarkAddedIcon
              sx={{
                fontSize: 50,
                color: "#a1d63e",
              }}
            />
          </div>
        )}

        <img
          src={cover}
          alt={playlist.title}
          className="playlist-card-cover"
        />
      </div>

      <div className="playlist-card-info">
        <h2 className="playlist-card-title">{playlist.title}</h2>

        <p className="playlist-card-book">
          {book ? book.title : "Custom Book"}
        </p>

        <p className="playlist-card-count">{playlist.song_count} songs</p>
      </div>
    </div>
  );
}