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

# Blueprint
from . import songs_bp


#_________________ADD SONG TO PLAYLIST_____________________

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
    song_id = data["song_id"]

    song = Songs.query.get(song_id)
    if not song:
        return jsonify({"error": "Song not found"}), 404

    # Prevent duplicates
    existing = Playlist_Songs.query.filter_by(
        playlist_id=playlist_id,
        song_id=song_id
    ).first()

    if existing:
        return jsonify({"error": "Song already in playlist"}), 400

    new_entry = Playlist_Songs(
        playlist_id=playlist_id,
        song_id=song_id
    )

    db.session.add(new_entry)
    db.session.commit()

    return jsonify(playlist_detail_schema.dump(playlist)), 201

#_________________REMOVE SONG FROM PLAYLIST_____________________

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