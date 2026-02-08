from flask import Blueprint, request, jsonify
from app.extensions import db

# Schemas
from app.blueprints.tags.schemas import (
    tag_base_schema,
    tag_dump_schema
)

# Playlist detail schema (to return updated playlist)
from app.blueprints.playlists.schemas import playlist_detail_schema

# Models
from app.models import Tags, Playlists, Playlist_Tags

# Auth
from app.utility.auth import token_required, require_role

# Blueprint
from . import tags_bp


#___________________CREATE TAG___________________#
@tags_bp.post("")
@token_required
@require_role("admin")
def create_tag(current_user):
    data = request.get_json()
    mood_name = data.get("mood_name")
    category = data.get("category")  # Optional field

    if not mood_name:
        return {"error": "mood_name is required"}, 400

    existing = Tags.query.filter_by(mood_name=mood_name).first()
    if existing:
        return {"message": "Tag already exists", "tag_id": existing.id}, 200

    tag = Tags(mood_name=mood_name, category=category)
    db.session.add(tag)
    db.session.commit()

    return {"message": "Tag created", "tag_id": tag.id}, 201


#___________________GET ALL TAGS___________________#
@tags_bp.route("", methods=["GET"])
def get_all_tags():
    tags = Tags.query.all()
    return jsonify(tag_dump_schema.dump(tags, many=True)), 200


#___________________ADD TAG TO PLAYLIST___________________#
@tags_bp.route("/playlists/<int:playlist_id>/tags", methods=["POST"])
@token_required
def add_tag_to_playlist(current_user, playlist_id):
    playlist = Playlists.query.get(playlist_id)
    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404

    if playlist.user_id != current_user.id:
        return jsonify({"error": "You do not own this playlist."}), 403

    data = tag_base_schema.load(request.get_json())
    tag_id = data["tag_id"]

    tag = Tags.query.get(tag_id)
    if not tag:
        return jsonify({"error": "Tag not found"}), 404

    # Prevent duplicates
    existing = Playlist_Tags.query.filter_by(
        playlist_id=playlist_id,
        tag_id=tag_id
    ).first()

    if existing:
        return jsonify({"error": "Tag already added"}), 400

    new_entry = Playlist_Tags(
        playlist_id=playlist_id,
        tag_id=tag_id
    )

    db.session.add(new_entry)
    db.session.commit()

    return jsonify(playlist_detail_schema.dump(playlist)), 201


#___________________REMOVE TAG FROM PLAYLIST___________________#
@tags_bp.route("/playlists/<int:playlist_id>/tags/<int:tag_id>", methods=["DELETE"])
@token_required
def remove_tag_from_playlist(current_user, playlist_id, tag_id):
    playlist = Playlists.query.get(playlist_id)
    if not playlist:
        return jsonify({"error": "Playlist not found"}), 404

    if playlist.user_id != current_user.id:
        return jsonify({"error": "You do not own this playlist."}), 403

    entry = Playlist_Tags.query.filter_by(
        playlist_id=playlist_id,
        tag_id=tag_id
    ).first()

    if not entry:
        return jsonify({"error": "Tag not in playlist"}), 404

    db.session.delete(entry)
    db.session.commit()

    return jsonify(playlist_detail_schema.dump(playlist)), 200