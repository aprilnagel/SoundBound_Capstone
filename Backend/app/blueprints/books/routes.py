from flask import Blueprint, request, jsonify
from app.blueprints.books.schemas import book_dump_schema
from app.utility.auth import token_required
from . import books_bp
from app.models import Books, Users
from app.extensions import db
from sqlalchemy import func, or_

from app.utility.openlibrary import fetch_openlibrary_work
from app.utility.tags import sync_book_subjects_to_tags


#_____________________BOOKS SEARCH_____________________#

@books_bp.route("/search", methods=["GET"])
def search_books():
    query = request.args.get("query", "").strip()

    if not query:
        return jsonify([]), 200

    base_filters = or_(
        Books.title.ilike(f"%{query}%"),
        Books.author_names.cast(db.String).ilike(f"%{query}%")
    )

    isbn_filter = Books.isbn_list.contains([query])
    partial_isbn_filter = Books.isbn_list.cast(db.String).ilike(f"%{query}%")

    results = Books.query.filter(
        or_(base_filters, isbn_filter, partial_isbn_filter)
    ).all()

    return jsonify(book_dump_schema.dump(results, many=True)), 200


#_____________________BOOK DETAILS_____________________#

@books_bp.route("/<int:book_id>", methods=["GET"])
def get_book_details(book_id):
    book = Books.query.get(book_id)

    if not book:
        return jsonify({"message": "Book not found"}), 404

    return jsonify(book_dump_schema.dump(book)), 200


#_____________________IMPORT BOOK FROM OPEN LIBRARY_____________________#

@books_bp.route("/import", methods=["POST"])
@token_required
def import_book(current_user):
    data = request.get_json()
    work_key = data.get("openlib_work_key")

    if not work_key:
        return jsonify({"error": "openlib_work_key is required"}), 400

    # 1. Check if already exists
    existing = Books.query.filter_by(openlib_work_key=work_key).first()
    if existing:
        return jsonify({"book_id": existing.id}), 200

    # 2. Fetch from Open Library
    ol_data = fetch_openlibrary_work(work_key)
    if not ol_data:
        return jsonify({"error": "Failed to fetch book from Open Library"}), 400

    # 3. Create book instance (ONLY using fields your importer returns)
    book = Books(
        title=ol_data["title"],
        description=ol_data["description"],
        subjects=ol_data["subjects"],
        author_names=[],              # frontend will fill this later
        openlib_author_keys=[],       # frontend will fill this later
        cover_url=None,               # frontend will fill this later
        isbn_list=[],                 # frontend will fill this later
        first_publish_year=None,      # frontend will fill this later
        openlib_work_key=work_key,
        source="openlibrary"
    )

    db.session.add(book)
    db.session.commit()

    # 4. Sync subjects → tags
    sync_book_subjects_to_tags(book)

    return jsonify({"book_id": book.id}), 201


#_____________________SIMILAR BOOKS_____________________#

@books_bp.route("/<int:book_id>/similar", methods=["GET"])
def get_similar_books(book_id):
    book = Books.query.get(book_id)

    if not book:
        return jsonify({"message": "Book not found"}), 404

    if not book.subjects:
        return jsonify([]), 200

    similar = Books.query.filter(
        Books.id != book_id,
        Books.subjects.overlap(book.subjects)
    ).limit(20).all()

    return jsonify(book_dump_schema.dump(similar, many=True)), 200


#_____________________POPULAR BOOKS_____________________#

@books_bp.route("/popular", methods=["GET"])
def get_popular_books():
    popularity = (
        db.session.query(
            func.unnest(Users.library).label("book_id"),
            func.count().label("count")
        )
        .group_by("book_id")
        .order_by(func.count().desc())
        .limit(20)
        .all()
    )

    book_ids = [row.book_id for row in popularity]
    books = Books.query.filter(Books.id.in_(book_ids)).all()

    return jsonify(book_dump_schema.dump(books, many=True)), 200