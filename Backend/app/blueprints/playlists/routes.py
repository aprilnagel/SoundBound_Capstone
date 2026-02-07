from flask import Blueprint, request, jsonify
from app.blueprints.playlists import playlists_bp
from app.models import Books, Playlists, Playlist_Songs, Playlist_Books, Songs
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


#_________________CREATE PLAYLISTS_____________________

@playlists_bp.route("", methods=["POST"])
@token_required
def create_playlist(current_user):
    data = playlist_schema.load(request.get_json())

    book_id = data.get("book_id")
    custom_title = data.get("custom_book_title")
    custom_author = data.get("custom_author_name")
    is_author_reco = data.get("is_author_reco", False)

    #---------------------------------------------------------
    # 1. VALIDATION: Prevent mixing verified + custom fields
    #---------------------------------------------------------
    if book_id and (custom_title or custom_author):
        return jsonify({
            "error": "Cannot provide custom book fields when book_id is present."
        }), 400

    if not book_id and (custom_title or custom_author):
        playlist_type = "custom"
    elif book_id:
        playlist_type = "verified"
    else:
        return jsonify({
            "error": "Either book_id OR custom book fields are required."
        }), 400

    #---------------------------------------------------------
    # 2. VERIFIED PLAYLIST LOGIC
    #---------------------------------------------------------
    if playlist_type == "verified":
        book = Books.query.get(book_id)
        if not book:
            return jsonify({"error": "Book not found"}), 404

        # Author Recommendation Playlist
        if is_author_reco:
            if current_user.role != "author":
                return jsonify({"error": "Only authors can create author recommendation playlists."}), 403

            # TODO: Validate book belongs to this author
            new_playlist = Playlists(
                title=data["title"],
                description=data.get("description"),
                is_public=True,
                is_author_reco=True,
                user_id=current_user.id
            )

        # Normal Verified Playlist
        else:
            # Must be in user's library
            if not current_user.library or str(book_id) not in current_user.library:
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
        new_playlist.books.append(book)
        db.session.commit()
        return jsonify(playlist_dump_schema.dump(new_playlist)), 201

    #---------------------------------------------------------
    # 3. CUSTOM PLAYLIST LOGIC
    #---------------------------------------------------------
    if playlist_type == "custom":
        if not custom_title or not custom_author:
            return jsonify({
                "error": "custom_book_title and custom_author_name are required."
            }), 400

        new_playlist = Playlists(
            title=data["title"],
            description=data.get("description"),
            is_public=False,
            is_author_reco=False,
            custom_book_title=custom_title,
            custom_author_name=custom_author,
            user_id=current_user.id
        )

        db.session.add(new_playlist)
        db.session.commit()
        return jsonify(playlist_dump_schema.dump(new_playlist)), 201


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