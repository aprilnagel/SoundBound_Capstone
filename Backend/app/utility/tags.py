from app.extensions import db
from app.models import Tags, Book_Tags
from slugify import slugify


def normalize(name: str) -> str:
    return slugify(name).lower()


# ---------------- BOOK SUBJECTS → TAGS ---------------- #

def sync_book_subjects_to_tags(book):
    """Sync Open Library subjects into Tags + Book_Tags."""
    if not book.subjects:
        return

    for subject in book.subjects:
        normalized = normalize(subject)

        # Find or create tag
        tag = Tags.query.filter_by(normalized_name=normalized).first()
        if not tag:
            tag = Tags(
                name=subject,
                normalized_name=normalized,
                source="openlib",
                category="subject",
                is_official=False
            )
            db.session.add(tag)
            db.session.commit()

        # Link book ↔ tag
        exists = Book_Tags.query.filter_by(
            book_id=book.id,
            tag_id=tag.id
        ).first()

        if not exists:
            db.session.add(Book_Tags(book_id=book.id, tag_id=tag.id))

    db.session.commit()