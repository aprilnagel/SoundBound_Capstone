from flask import Blueprint, request, jsonify
from app.extensions import db

# Schemas for playlist-song operations
from app.blueprints.playlists.schemas import (
    playlist_song_schema,
    playlist_song_dump_schema,
    playlist_detail_schema
)

# Models needed for playlist-song logic
from app.models import Playlists, Playlist_Songs, Songs

# Auth
from app.utility.auth import token_required

# Spotify helpers
from app.utility.spotify import (
    fetch_spotify_track,
    fetch_audio_features,
    fetch_genres_for_artists,
    search_spotify_tracks,
)

# Blueprint
from . import songs_bp


#------------------SEARCH SONGS (SPOTIFY)------------------#
@songs_bp.route("/spotify/search")
@token_required
def spotify_search(current_user):
    query = request.args.get("q")
    if not query:
        return jsonify({"error": "Missing query"}), 400

    tracks = search_spotify_tracks(query)
    return jsonify({"tracks": tracks}), 200


#---------------------------------------------------------
# ADD SONG TO PLAYLIST
# ---------------------------------------------------------
@songs_bp.route("/playlists/<int:playlist_id>/songs", methods=["POST"])
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


# ---------------------------------------------------------
# IMPORT SONG FROM SPOTIFY (standalone)
# ---------------------------------------------------------
@songs_bp.route("/import", methods=["POST"])
@token_required
def import_song(current_user):
    data = request.get_json()
    spotify_id = data.get("spotify_id")

    if not spotify_id:
        return jsonify({"error": "spotify_id is required"}), 400

    # 1. Check if song already exists
    existing = Songs.query.filter_by(spotify_id=spotify_id).first()
    if existing:
        return jsonify({"song_id": existing.id}), 200

    # 2. Fetch track metadata
    track = fetch_spotify_track(spotify_id)
    if not track:
        return jsonify({"error": "Failed to fetch track from Spotify"}), 400

    # 3. Fetch audio features
    features = fetch_audio_features(spotify_id)

    # 4. Fetch genres for ALL artists
    genres = fetch_genres_for_artists(track["artist_ids"])

    # 5. Create Song instance
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

    return jsonify({"song_id": song.id}), 201


# ---------------------------------------------------------
# REMOVE SONG FROM PLAYLIST
# ---------------------------------------------------------
@songs_bp.route("/playlists/<int:playlist_id>/songs/<int:song_id>", methods=["DELETE"])
@token_required
def remove_song_from_playlist(current_user, playlist_id, song_id):
    playlist = Playlists.query.get(playlist_id)
    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404

    # Only the owner can modify the playlist
    if playlist.user_id != current_user.id:
        return jsonify({"error": "You do not own this playlist."}), 403

    entry = Playlist_Songs.query.filter_by(
        playlist_id=playlist_id,
        song_id=song_id
    ).first()

    if not entry:
        return jsonify({"error": "Song not in playlist"}), 404

    db.session.delete(entry)
    db.session.commit()

    return jsonify(playlist_detail_schema.dump(playlist)), 200