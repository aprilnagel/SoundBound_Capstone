from .extensions import db
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func




# no need for junction tables as relationships are defined in the models directly

#_____________USERS_____________________
class Users(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(250), nullable=False)
    last_name = db.Column(db.String(250), nullable=False)
    username = db.Column(db.String(250), unique=True, nullable=False)
    email = db.Column(db.String(250), unique=True, nullable=False)
    password = db.Column(db.String(250), nullable=False)
    role = db.Column(
        db.Enum('reader', 'admin', 'author', name='user_roles'), 
        default='reader', 
        nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    openlib_author_key = db.Column(db.String(250), nullable=True)
    
    #------------RELATIONSHIPS-----------------
    
    playlists = relationship("Playlists", backref="user", lazy=True)
    authored_books = relationship(
        "Books", 
        secondary="book_authors", 
        backref="authors", 
        lazy='dynamic')

#_____________AUTHOR VERIFICATION REQUESTS_____________________
class Author_verification_requests(db.Model):
    
    __tablename__ = 'author_verification_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    author_bio = db.Column(db.String(1000), nullable=False)
    openlib_author_key = db.Column(db.String(250), nullable=False)
    proof_links = db.Column(db.String(1000), nullable=True)
    notes = db.Column(db.String(1000), nullable=True)
    status = db.Column(
        db.Enum('pending', 'approved', 'rejected', name='verification_statuses'), 
        default='pending', 
        nullable=False)
    submitted_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    reviewed_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

#------------RELATIONSHIPS-----------------
    user = relationship("Users", foreign_keys=[user_id], backref="verification_requests")
    reviewer = relationship("Users", foreign_keys=[reviewed_by])


#_____________BOOKS_____________________
#this table is for verified books only from the API. 
class Books(db.Model):
    __tablename__ = 'books'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    author_name = db.Column(db.String(250), nullable=False)
    api_source = db.Column(db.String(250), nullable=True)
    api_id = db.Column(db.String(250), nullable=True)
    cover_url = db.Column(db.String(500), nullable=True)
    description = db.Column(db.String(2000), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    openlib_author_key = db.Column(db.String(250), nullable=True)
    openlib_work_key = db.Column(db.String(250), nullable=True)
    first_publish_year = db.Column(db.Integer, nullable=True)
    
#------------RELATIONSHIPS-----------------
    # Multi-author support
    authors = relationship(
        "Users",
        secondary="book_authors",
        backref="authored_books",
        lazy="dynamic"
    )

    # Tags on books
    tags = relationship(
        "Tags",
        secondary="book_tags",
        backref="books",
        lazy="dynamic"
    )

    # Playlists that include this book
    playlists = relationship(
        "Playlists",
        secondary="playlist_books",
        backref="books",
        lazy="dynamic"
    )

    

#_____________PLAYLISTS_____________________
#playlists is where users can create custom book titles if they cannot find the verified book in the Books table. eventually, the API can try to match the titles from playlists to add verified books to the Books table using the title and author name.
class Playlists(db.Model):
    __tablename__ = 'playlists'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(250), nullable=False)
    description = db.Column(db.String(1000), nullable=True)
    is_public = db.Column(db.Boolean, default=True, nullable=False)
    is_author_reco = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    openlib_author_key = db.Column(db.String(250), nullable=True)
    custom_book_title = db.Column(db.String(250), nullable=True)
    custom_author_name = db.Column(db.String(250), nullable=True)
    
#------------RELATIONSHIPS-----------------
    # Books included in this playlist
    books = relationship(
        "Books",
        secondary="playlist_books",
        backref="playlists",
        lazy="dynamic"
    )

    # Tags applied to this playlist
    tags = relationship(
        "Tags",
        secondary="playlist_tags",
        backref="playlists",
        lazy="dynamic"
    )

    # Songs in this playlist (ordered)
    songs = relationship(
        "Songs",
        secondary="playlist_songs",
        backref="playlists",
        lazy="dynamic"
    )

    
#_____________SONGS_____________________
class Songs(db.Model):
    __tablename__ = 'songs'
    
    id = db.Column(db.Integer, primary_key=True)
    api_id = db.Column(db.String(250), nullable=False)
    title = db.Column(db.String(500), nullable=False)
    artists = db.Column(db.JSON, nullable=False) #storing as JSON to accommodate multiple artists
    album = db.Column(db.String(250), nullable=True)
    album_art = db.Column(db.String(500), nullable=True)
    preview_url = db.Column(db.String(500), nullable=True)
    api_metadata = db.Column(db.String(1000), nullable=True)
    source = db.Column(db.String(250), nullable=False, default="Spotify")

#------------RELATIONSHIPS-----------------
    playlists = relationship(
    "Playlists",
    secondary="playlist_songs",
    backref="songs",
    lazy="dynamic"
)

#_____________TAGS_____________________
class Tags(db.Model):
    __tablename__ = 'tags'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), unique=True, nullable=False)

#------------RELATIONSHIPS-----------------
    # Books that use this tag
    books = relationship(
        "Books",
        secondary="book_tags",
        backref="tags",
        lazy="dynamic"
    )

    # Playlists that use this tag
    playlists = relationship(
        "Playlists",
        secondary="playlist_tags",
        backref="tags",
        lazy="dynamic"
    )

#_____________ASSOCIATION TABLES_____________________
    
class Playlist_Songs(db.Model):
    __tablename__ = 'playlist_songs'

    playlist_id = db.Column(db.Integer, db.ForeignKey('playlists.id'), primary_key=True)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), primary_key=True)
    
#_____________JUNCTION TABLES_____________________
#all tables use composite primary keys to prevent duplicate entries
class Playlist_Books(db.Model):
    __tablename__ = 'playlist_books'
    
    playlist_id = db.Column(db.Integer, db.ForeignKey('playlists.id'), primary_key=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id'), primary_key=True)

class Playlist_Tags(db.Model):
    __tablename__ = 'playlist_tags'

    playlist_id = db.Column(db.Integer, db.ForeignKey('playlists.id'), primary_key=True)
    tag_id = db.Column(db.Integer, db.ForeignKey('tags.id'), primary_key=True)
    
class Book_Tags(db.Model):
    __tablename__ = 'book_tags'

    book_id = db.Column(db.Integer, db.ForeignKey('books.id'), primary_key=True)
    tag_id = db.Column(db.Integer, db.ForeignKey('tags.id'), primary_key=True)
    
class Book_Authors(db.Model):
    __tablename__ = 'book_authors'

    book_id = db.Column(db.Integer, db.ForeignKey('books.id'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)

    