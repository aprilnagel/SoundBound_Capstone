from flask import Blueprint, request, jsonify
import requests
from app.blueprints.books.schemas import book_dump_schema
from app.utility.auth import token_required
from . import books_bp
from app.models import Books, Users
from app.extensions import db
from sqlalchemy import func
from app.utility.openlibrary import fetch_openlibrary_work


#_____________________BOOKS SEARCH (TIGHTENED)_____________________#

@books_bp.route("/search", methods=["GET"])
@token_required
def search_books(current_user):
    title = request.args.get("title", "").strip()
    author = request.args.get("author", "").strip()
    isbn = request.args.get("isbn", "").strip()
    year = request.args.get("year", "").strip()

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

    if not query_parts:
        return jsonify({"error": "Provide at least one of: title, author, isbn, year"}), 400

    q = " ".join(query_parts)

    url = "https://openlibrary.org/search.json"
    params = {"q": q, "limit": 50}  # fetch more so filtering is effective

    resp = requests.get(url, params=params)
    if resp.status_code != 200:
        return jsonify({"error": "Failed to fetch from Open Library"}), 500

    data = resp.json()
    docs = data.get("docs", [])

    # -----------------------------
    # FILTERING HELPERS
    # -----------------------------

    def title_matches(doc):
        if not title:
            return True
        t = title.lower()
        book_title = doc.get("title", "").lower()
        return t in book_title

    def author_matches(doc):
        if not author:
            return True
        a = author.lower()
        raw_authors = doc.get("author_name") or doc.get("author_names") or []
        return any(a in auth.lower() for auth in raw_authors)

    def isbn_matches(doc):
        if not isbn:
            return True
        isbns = doc.get("isbn", [])
        return isbn in isbns

    def year_matches(doc):
        if not year:
            return True
        return str(doc.get("first_publish_year", "")) == year

    # -----------------------------
    # NORMALIZATION
    # -----------------------------

    def normalize(doc):
        raw_authors = (
            doc.get("author_name")
            or doc.get("author_names")
            or []
        )

        # Remove garbage like "THIS IS A MARVELLOUS BOOK..."
        authors = [
            a for a in raw_authors
            if a and len(a.split()) > 1
        ]

        return {
            "title": doc.get("title", "Unknown Title"),
            "authors": authors,
            "publish_year": doc.get("first_publish_year"),
            "cover_id": doc.get("cover_i"),
            "openlib_id": doc.get("key", "").split("/")[-1],
        }

    # -----------------------------
    # APPLY FILTERS
    # -----------------------------

    filtered = []
    for doc in docs:
        if not title_matches(doc):
            continue
        if not author_matches(doc):
            continue
        if not isbn_matches(doc):
            continue
        if not year_matches(doc):
            continue
        filtered.append(doc)

    # Normalize output
    results = [normalize(doc) for doc in filtered]

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
        # Add to user's library if not already present
        user_library = current_user.library or []
        if existing.id not in user_library:
            current_user.library = user_library + [existing.id]
            db.session.commit()

        return jsonify({"book_id": existing.id}), 200

    # ---------------------------------------------------------
    # 2. FETCH FULL METADATA FROM OPEN LIBRARY
    # ---------------------------------------------------------
    ol_data = fetch_openlibrary_work(openlib_id)
    if not ol_data:
        return jsonify({"error": "Failed to fetch book from Open Library"}), 400

    # ---------------------------------------------------------
    # 3. CREATE NEW BOOK INSTANCE USING FULL METADATA
    # ---------------------------------------------------------
    book = Books(
        title=ol_data.get("title"),
        description=ol_data.get("description"),
        subjects=ol_data.get("subjects"),
        author_names=ol_data.get("author_names"),
        author_keys=ol_data.get("author_keys"),
        cover_url=ol_data.get("cover_url"),
        cover_id=ol_data.get("cover_id"),
        isbn_list=ol_data.get("isbn_list"),
        first_publish_year=ol_data.get("first_publish_year"),
        openlib_id=openlib_id,
        api_source="openlibrary",
        api_id=openlib_id,
        source="verified"
    )

    db.session.add(book)
    db.session.commit()  # book.id now exists

    # ---------------------------------------------------------
    # 4. ADD INTERNAL BOOK ID TO USER'S LIBRARY
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