import fallbackCover from "../../Photos/2.png";
import "./PlaylistCard.css";
import BookmarkAddedIcon from "@mui/icons-material/BookmarkAdded";

export default function PlaylistCard({ playlist, onClick }) {
  const book = playlist.books?.[0];
  const cover = book?.cover_url || fallbackCover;

  return (
    <div className="playlist-card" onClick={onClick}>
      <img src={cover} alt={playlist.title} className="playlist-card-cover" />

      

      <div className="playlist-card-info">
        {playlist.is_author_reco && (
        <BookmarkAddedIcon
          sx={{
            fontSize: 40,
            color: "#a1d63e",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))",
          }}
        />
      )}
        <h2 className="playlist-card-title">{playlist.title}</h2>
        

        <p className="playlist-card-book">
          {book ? book.title : "Custom Book"}
        </p>

        <p className="playlist-card-count">{playlist.song_count} songs</p>
      </div>
    </div>
  );
}
