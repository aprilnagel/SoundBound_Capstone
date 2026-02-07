from app.extensions import db
from app.models import Tags, Book_Tags, Song_Tags
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

        exists = Book_Tags.query.filter_by(
            book_id=book.id,
            tag_id=tag.id
        ).first()

        if not exists:
            db.session.add(Book_Tags(book_id=book.id, tag_id=tag.id))

    db.session.commit()


# ---------------- SONG GENRES → TAGS ---------------- #

def sync_song_genres_to_tags(song):
    """Sync Spotify genres into Tags + Song_Tags."""
    if not song.genres:
        return

    for genre in song.genres:
        normalized = normalize(genre)

        tag = Tags.query.filter_by(normalized_name=normalized).first()
        if not tag:
            tag = Tags(
                name=genre,
                normalized_name=normalized,
                source="spotify",
                category="genre",
                is_official=True
            )
            db.session.add(tag)
            db.session.commit()

        exists = Song_Tags.query.filter_by(
            song_id=song.id,
            tag_id=tag.id
        ).first()

        if not exists:
            db.session.add(Song_Tags(song_id=song.id, tag_id=tag.id))

    db.session.commit()