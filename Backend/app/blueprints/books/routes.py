from flask import Blueprint, request, jsonify
import requests
from app.blueprints.books.schemas import book_dump_schema
from app.utility.auth import token_required
from . import books_bp
from app.models import Books, Users
from app.extensions import db
from sqlalchemy import func
from app.utility.openlibrary import fetch_openlibrary_work
from flask_cors import cross_origin


# _____________________ BOOKS SEARCH (RESTORED SIMPLE VERSION) _____________________ #

@books_bp.route("/search", methods=["GET"])
@token_required
def search_books(current_user):
    title = request.args.get("title", "").strip()
    author = request.args.get("author", "").strip()
    isbn = request.args.get("isbn", "").strip()
    year = request.args.get("year", "").strip()  # UI sends it; we can safely ignore for now

    # Build Open Library query
    query_parts = []
    if title:
        query_parts.append(f"title:{title}")
    if author:
        query_parts.append(f"author:{author}")
    if isbn:
        query_parts.append(f"isbn:{isbn}")
    if year:
        query_parts.append(f"first_publish_year:{year}")

    # If nothing provided, complain
    if not query_parts:
        return jsonify({"error": "Provide at least one of: title, author, isbn, year"}), 400

    q = " ".join(query_parts)

    url = "https://openlibrary.org/search.json"
    params = {
        "q": q,
        "limit": 20,  # small, clean result set like before
    }

    resp = requests.get(url, params=params)
    if resp.status_code != 200:
        return jsonify({"error": "Failed to fetch from Open Library"}), 500

    data = resp.json()
    docs = data.get("docs", [])

    results = []
    for doc in docs:
        cover_id = doc.get("cover_i")

        # Only keep docs that actually have a real cover
        if not cover_id:
            continue

        results.append({
            "title": doc.get("title", "Unknown Title"),
            "authors": doc.get("author_name", []) or [],
            "publish_year": doc.get("first_publish_year"),
            "cover_id": cover_id,
            "openlib_id": doc.get("key", "").split("/")[-1],
        })

    return jsonify(results), 200


#_____________________BOOK DETAILS_____________________#

@books_bp.route("/<openlib_id>", methods=["GET"])
@token_required
def get_book_details(current_user, openlib_id):
    # Normalize ID
    openlib_id = openlib_id.split("/")[-1]

    # 1. Try to fetch from DB first
    book = Books.query.filter_by(openlib_id=openlib_id).first()

    if book:
        return jsonify(book_dump_schema.dump(book)), 200

    # 2. If not in DB, fetch full metadata from Open Library
    ol_data = fetch_openlibrary_work(openlib_id)
    if not ol_data:
        return jsonify({"error": "Failed to fetch book from Open Library"}), 400

    # 3. Return the preview metadata (NOT inserted into DB)
    return jsonify(ol_data), 200


#_____________________IMPORT BOOK FROM OPEN LIBRARY_____________________#

@books_bp.route("/add-book", methods=["POST"])
@cross_origin()  # Allow CORS for this route
@token_required
def import_book(current_user):
    data = request.get_json()

    raw_id = data.get("openlib_id")
    if not raw_id:
        return jsonify({"error": "openlib_id is required"}), 400

    # Normalize ID (handles "works/OL123W" or "OL123W")
    openlib_id = raw_id.split("/")[-1]

    # ---------------------------------------------------------
    # 1. CHECK IF BOOK ALREADY EXISTS IN OUR DATABASE
    # ---------------------------------------------------------
    existing = Books.query.filter_by(openlib_id=openlib_id).first()

    if existing:
        user_library = current_user.library or []

    if existing.id in user_library:
        return jsonify({"error": "This book is already in your library"}), 400

    # Book exists but user doesn't have it yet
    current_user.library = user_library + [existing.id]
    db.session.commit()

    return jsonify({"message": "Book added to your library"}), 200


    # ---------------------------------------------------------
    # 2. FETCH FULL METADATA FROM OPEN LIBRARY
    # ---------------------------------------------------------
    ol_data = fetch_openlibrary_work(openlib_id)
    if not ol_data:
        return jsonify({"error": "Failed to fetch book from Open Library"}), 400

    # ---------------------------------------------------------
    # 3. EXTRACT JUST THE YEAR (4 digits)
    # ---------------------------------------------------------
    import re

    raw_year = ol_data.get("first_publish_year")
    year = None

    if raw_year:
        # Convert to string and search for a 4-digit year
        match = re.search(r"\b(\d{4})\b", str(raw_year))
        if match:
            year = int(match.group(1))

    # ---------------------------------------------------------
    # 4. CLEAN JSON FIELDS
    # ---------------------------------------------------------
    subjects = ol_data.get("subjects") or []
    author_names = ol_data.get("author_names") or []
    author_keys = ol_data.get("author_keys") or []
    isbn_list = ol_data.get("isbn_list") or []

    # ---------------------------------------------------------
    # 5. CREATE NEW BOOK INSTANCE
    # ---------------------------------------------------------
    desc = ol_data.get("description")
    if isinstance(desc, dict):
        desc = desc.get("value")
    elif not isinstance(desc, str):
        desc = None

    book = Books(
        title=ol_data.get("title"),
        description=desc,   # ⭐ FIXED
        subjects=subjects,
        author_names=author_names,
        author_keys=author_keys,
        cover_url=ol_data.get("cover_url"),
        cover_id=ol_data.get("cover_id"),
        isbn_list=isbn_list,
        first_publish_year=year,
        openlib_id=openlib_id,
        api_source="openlibrary",
        api_id=openlib_id,
        source="verified"
    )


    db.session.add(book)
    db.session.commit()

    # ---------------------------------------------------------
    # 6. ADD BOOK TO USER LIBRARY
    # ---------------------------------------------------------
    user_library = current_user.library or []
    current_user.library = user_library + [book.id]
    db.session.commit()

    return jsonify({"book_id": book.id}), 201


#_____________________SIMILAR BOOKS_____________________#

@books_bp.route("/<openlib_id>/similar", methods=["GET"])
@token_required
def get_similar_books(current_user, openlib_id):
    book = Books.query.filter_by(openlib_id=openlib_id).first()

    if not book:
        return jsonify({"message": "Book not found"}), 404

    if not book.subjects:
        return jsonify([]), 200

    similar = Books.query.filter(
        Books.id != book.id,
        Books.subjects.overlap(book.subjects)
    ).limit(20).all()

    return jsonify(book_dump_schema.dump(similar, many=True)), 200


#_____________________POPULAR BOOKS_____________________#

@books_bp.route("/popular", methods=["GET"])
@token_required
def get_popular_books(current_user):
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