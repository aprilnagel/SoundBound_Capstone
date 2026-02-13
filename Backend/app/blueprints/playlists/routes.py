from flask import Blueprint, request, jsonify
from app.blueprints.playlists import playlists_bp
from app.models import Books, Playlist_Songs, Playlists, Songs, Tags
from app.extensions import db

from app.blueprints.playlists.schemas import (
    playlist_schema,
    playlist_update_schema,
    playlist_dump_schema,
    playlists_dump_schema,
    playlist_detail_schema,
    playlist_song_schema,
    playlist_song_dump_schema
)
from app.utility.auth import require_role, token_required

from app.utility.spotify import (
    fetch_spotify_track,
    fetch_audio_features,
    fetch_genres_for_artists
)



#_________________CREATE PLAYLISTS_____________________#

@playlists_bp.route("", methods=["POST"])
@token_required
def create_playlist(current_user):
    data = playlist_schema.load(request.get_json())

    book_id = data.get("book_id")
    custom_title = data.get("custom_book_title")
    custom_author = data.get("custom_author_name")
    custom_year = data.get("custom_publish_year")
    is_author_reco = data.get("is_author_reco", False)

    # Determine playlist type
    playlist_type = "verified" if book_id else "custom"

    #---------------------------------------------------------
    # 2. VERIFIED PLAYLIST LOGIC
    #---------------------------------------------------------
    if playlist_type == "verified":
        book = Books.query.get(book_id)
        if not book:
            return jsonify({"error": "Book not found"}), 404

        # Prevent multiple playlists for the same book by the same user
        existing = (
            Playlists.query
            .join(Playlists.books)
            .filter(
                Playlists.user_id == current_user.id,
                Books.id == book_id
            )
            .first()
        )

        if existing:
            return jsonify({
                "error": "You already created a playlist for this book."
            }), 400



        # Author Recommendation Playlist
        if is_author_reco:
            if current_user.role != "author":
                return jsonify({"error": "Only authors can create author recommendation playlists."}), 403
            
            user_keys = set(current_user.author_keys or [])
            book_keys = set(book.author_keys or [])
            if not user_keys.intersection(book_keys):
                return jsonify({
                    "error": "You can only create author recommendation playlists for books you've authored."
                }), 403

            new_playlist = Playlists(
                title=data["title"],
                description=data.get("description"),
                is_public=True,
                is_author_reco=True,
                user_id=current_user.id
            )

        # Normal Verified Playlist
        else:
            if not current_user.library or book_id not in current_user.library:
                return jsonify({
                    "error": "You must add this book to your library before creating a playlist."
                }), 403

            new_playlist = Playlists(
                title=data["title"],
                description=data.get("description"),
                is_public=False,
                is_author_reco=False,
                user_id=current_user.id
            )

        db.session.add(new_playlist)
        db.session.flush()

        new_playlist.books.append(book)
        db.session.commit()
        return jsonify(playlist_dump_schema.dump(new_playlist)), 201

    #---------------------------------------------------------
    # 3. CUSTOM PLAYLIST LOGIC
    #---------------------------------------------------------
    if playlist_type == "custom":
        # Create the custom book
        custom_book = Books(
            title=custom_title,
            author_names=[custom_author],
            api_source=None,
            api_id=None,
            cover_url=None,
            description=None,
            author_keys=[],
            openlib_id=None,
            cover_id=None,
            isbn_list=[],
            first_publish_year=custom_year,
            subjects=[],
            source="custom"
        )

        db.session.add(custom_book)
        db.session.flush()

        # Add custom book to user's library
        current_user.library = (current_user.library or []) + [custom_book.id]

        # Create the playlist
        new_playlist = Playlists(
            title=data["title"],
            description=data.get("description"),
            is_public=False,
            is_author_reco=False,
            user_id=current_user.id
        )

        db.session.add(new_playlist)
        db.session.flush()

        new_playlist.books.append(custom_book)
        db.session.commit()

        return jsonify(playlist_dump_schema.dump(new_playlist)), 201

# ---------------------------------------------------------
# ADD SONG TO PLAYLIST  (belongs in playlists_bp)
# ---------------------------------------------------------
@playlists_bp.route("/<int:playlist_id>/songs", methods=["POST"])
@token_required
def add_song_to_playlist(current_user, playlist_id):
    playlist = Playlists.query.get(playlist_id)
    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404

    # Only the owner can modify the playlist
    if playlist.user_id != current_user.id:
        return jsonify({"error": "You do not own this playlist."}), 403

    data = playlist_song_schema.load(request.get_json())
    spotify_id = data["spotify_id"]

    # 1. Check if song exists
    song = Songs.query.filter_by(spotify_id=spotify_id).first()

    # 2. If not, import it
    if not song:
        track = fetch_spotify_track(spotify_id)
        if not track:
            return jsonify({"error": "Failed to fetch track from Spotify"}), 400

        features = fetch_audio_features(spotify_id)
        genres = fetch_genres_for_artists(track["artist_ids"])

        song = Songs(
            title=track["title"],
            artists=track["artists"],
            album=track["album"],
            preview_url=track["preview_url"],
            spotify_id=spotify_id,
            audio_features=features,
            genres=genres,
            source="spotify"
        )

        db.session.add(song)
        db.session.commit()

    # 3. Prevent duplicates
    existing = Playlist_Songs.query.filter_by(
        playlist_id=playlist_id,
        song_id=song.id
    ).first()

    if existing:
        return jsonify({"error": "Song already in playlist"}), 400

    # 4. Add to playlist
    new_entry = Playlist_Songs(
        playlist_id=playlist_id,
        song_id=song.id
    )

    db.session.add(new_entry)
    db.session.commit()
    db.session.refresh(playlist)

    return jsonify(playlist_detail_schema.dump(playlist)), 201

#_____________________GET ALL MY PLAYLISTS_____________________#

@playlists_bp.route("/me", methods=["GET"])
@token_required
def get_my_playlists(current_user):
    playlists = Playlists.query.filter_by(user_id=current_user.id).all()
    return jsonify(playlist_dump_schema.dump(playlists, many=True)), 200


#_____________________GET SPECIFIC PLAYLIST_____________________#

@playlists_bp.route("/<int:playlist_id>", methods=["GET"])
@token_required
def get_playlist_detail(current_user, playlist_id):
    playlist = Playlists.query.get(playlist_id)

    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404

    # If playlist is private, only the owner can view it
    if not playlist.is_public and playlist.user_id != current_user.id:
        return jsonify({"error": "You do not have permission to view this playlist."}), 403

    return jsonify(playlist_detail_schema.dump(playlist)), 200


#_____________________GET AUTHOR RECOMMENDATION PLAYLISTS_____________________#

@playlists_bp.route("/author-reco", methods=["GET"])
def get_author_reco_playlists():
    playlists = Playlists.query.filter_by(is_author_reco=True).all()
    return jsonify(playlist_dump_schema.dump(playlists, many=True)), 200


#_____________________UPDATE PLAYLIST_____________________#

@playlists_bp.route("/<int:playlist_id>", methods=["PUT"])
@token_required
def update_playlist(current_user, playlist_id):
    playlist = Playlists.query.get(playlist_id)

    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404

    if playlist.user_id != current_user.id:
        return jsonify({"error": "You do not own this playlist."}), 403

    data = playlist_update_schema.load(request.get_json())

    # Only allow title + description updates
    if "title" in data:
        playlist.title = data["title"]

    if "description" in data:
        playlist.description = data["description"]

    # Allow author-reco toggle ONLY for authors
    if "is_author_reco" in data:
        if current_user.role != "author":
            return jsonify({"error": "Only authors can toggle author recommendation."}), 403
        playlist.is_author_reco = data["is_author_reco"]
        playlist.is_public = data["is_author_reco"]

    db.session.commit()
    return jsonify(playlist_dump_schema.dump(playlist)), 200


#_____________________DELETE PLAYLIST_____________________#

@playlists_bp.route("/<int:playlist_id>", methods=["DELETE"])
@token_required
def delete_playlist(current_user, playlist_id):
    playlist = Playlists.query.get(playlist_id)

    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404

    # Only the owner can delete their playlist
    if playlist.user_id != current_user.id:
        return jsonify({"error": "You do not have permission to delete this playlist."}), 403

    db.session.delete(playlist)
    db.session.commit()

    return jsonify({"message": "Playlist deleted successfully."}), 200


#_____________________ADD TAG TO PLAYLIST_____________________#

@playlists_bp.route("/<int:playlist_id>/tags", methods=["POST"])
@token_required
def add_tag_to_playlist(current_user, playlist_id):
    playlist = Playlists.query.get(playlist_id)
    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404

    if playlist.user_id != current_user.id:
        return jsonify({"error": "You do not own this playlist."}), 403

    data = request.get_json()
    tag_id = data.get("tag_id")
    if not tag_id:
        return jsonify({"error": "tag_id is required"}), 400

    tag = Tags.query.get(tag_id)
    if not tag:
        return jsonify({"error": "Tag not found"}), 404

    # Prevent duplicates
    if tag in playlist.tags:
        return jsonify({"message": "Tag already added"}), 200

    playlist.tags.append(tag)
    db.session.commit()

    return jsonify(playlist_detail_schema.dump(playlist)), 200


#_____________________REMOVE TAG FROM PLAYLIST_____________________#

@playlists_bp.route("/<int:playlist_id>/tags/<int:tag_id>", methods=["DELETE"])
@token_required
def remove_tag_from_playlist(current_user, playlist_id, tag_id):
    playlist = Playlists.query.get(playlist_id)
    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404

    if playlist.user_id != current_user.id:
        return jsonify({"error": "You do not own this playlist."}), 403

    tag = Tags.query.get(tag_id)
    if not tag:
        return jsonify({"error": "Tag not found"}), 404

    if tag not in playlist.tags:
        return jsonify({"error": "Tag not in playlist"}), 400

    playlist.tags.remove(tag)
    db.session.commit()

    return jsonify(playlist_detail_schema.dump(playlist)), 200