from flask import Blueprint, request, jsonify
from app.blueprints.books.schemas import book_dump_schema
from . import books_bp
from app.models import Books, Users
from app.extensions import db
from sqlalchemy import func, or_


#_____________________BOOKS SEARCH (searches by title, author, and ISBN)_____________________#

@books_bp.route("/search", methods=["GET"])
def search_books():
    query = request.args.get("query", "").strip()

    if not query:
        return jsonify([]), 200

    # Case-insensitive match for title + author
    base_filters = or_(
        Books.title.ilike(f"%{query}%"),
        Books.author_names.cast(db.String).ilike(f"%{query}%")
    )

    # ISBN search (exact or partial match)
    isbn_filter = Books.isbn_list.contains([query])  # exact match

    # Partial ISBN match (e.g., searching "9780")
    partial_isbn_filter = Books.isbn_list.cast(db.String).ilike(f"%{query}%")

    results = Books.query.filter(
        or_(
            base_filters,
            isbn_filter,
            partial_isbn_filter
        )
    ).all()

    return jsonify(book_dump_schema.dump(results, many=True)), 200

#____________________BOOK DETAILS_____________________#
#get book details for book details page, also used for library page when user clicks on a book to view details. This is a separate route from search because we want to return more details about the book than just the title and author. We also want to return the book's description, cover image, and other details that are not included in the search results.

@books_bp.route("/<int:book_id>", methods=["GET"])
def get_book_details(book_id):
    book = Books.query.get(book_id)

    if not book:
        return jsonify({"message": "Book not found"}), 404

    return jsonify(book_dump_schema.dump(book)), 200

#___________________SEARCH FOR SIMILAR BOOKS___________________#
@books_bp.route("/<int:book_id>/similar", methods=["GET"])
def get_similar_books(book_id):
    book = Books.query.get(book_id)

    if not book:
        return jsonify({"message": "Book not found"}), 404

    # If the book has no subjects, we can't compute similarity
    if not book.subjects:
        return jsonify([]), 200

    # Find books that share at least one subject
    similar = Books.query.filter(
        Books.id != book_id,  # exclude the book itself
        Books.subjects.overlap(book.subjects)  # JSON array overlap
    ).limit(20).all()

    return jsonify(book_dump_schema.dump(similar, many=True)), 200

#____________________POPULAR BOOKS_____________________#
@books_bp.route("/popular", methods=["GET"])
def get_popular_books():
    """
    Return the most popular books based on how many users
    have each book_id saved in their library.
    """

    # Unnest all user.library arrays into rows
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

    # Extract just the book_ids
    book_ids = [row.book_id for row in popularity]

    # Fetch the actual Book objects
    books = Books.query.filter(Books.id.in_(book_ids)).all()

    return jsonify(book_dump_schema.dump(books, many=True)), 200
