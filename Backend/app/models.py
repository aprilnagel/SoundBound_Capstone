from datetime import datetime, timezone
from .extensions import db
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy.ext.mutable import MutableList





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
    author_keys = db.Column(db.JSON, nullable=True)
    author_bio = db.Column(db.String(1000), nullable=True)
    library = db.Column(MutableList.as_mutable(db.JSON), default=list)
    
    #------------RELATIONSHIPS-----------------
    
    playlists = relationship(
        "Playlists", 
        back_populates="user", 
        lazy=True)
    
    authored_books = relationship(
        "Books",
        secondary="book_authors", #junction table name
        back_populates="authors",
        lazy="dynamic"
    )
    
    verification_requests = relationship(
        "Author_verification_requests",
        back_populates="user",
        lazy="dynamic",
        foreign_keys="[Author_verification_requests.user_id]"
    )
    

#_____________AUTHOR VERIFICATION REQUESTS_____________________
class Author_verification_requests(db.Model):
    
    __tablename__ = 'author_verification_requests'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    author_bio = db.Column(db.String(1000), nullable=False)
    author_keys = db.Column(db.JSON, nullable=False)
    proof_links = db.Column(db.JSON, nullable=True)
    notes = db.Column(db.String(1000), nullable=True)
    status = db.Column(
        db.Enum('pending', 'approved', 'rejected', name='verification_statuses'), 
        default='pending', 
        nullable=False)
    submitted_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    reviewed_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    reviewed_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)

#------------RELATIONSHIPS-----------------
    user = relationship(
        "Users", 
        foreign_keys=[user_id], 
        back_populates="verification_requests")

    reviewer = relationship(
        "Users", 
        foreign_keys=[reviewed_by])


#_____________BOOKS_____________________
#this table is for verified books only from the API. 
class Books(db.Model):
    __tablename__ = 'books'
    
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    author_names = db.Column(db.JSON, nullable=False) 
    api_source = db.Column(db.String(250), nullable=True)
    api_id = db.Column(db.String(250), nullable=True)
    cover_url = db.Column(db.String(500), nullable=True)
    description = db.Column(db.String(2000), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())
    author_keys = db.Column(db.JSON, nullable=True)
    openlib_id = db.Column(db.String(250), nullable=True)
    cover_id = db.Column(db.Integer, nullable=True)
    isbn_list = db.Column(db.JSON, nullable=True)
    first_publish_year = db.Column(db.Integer, nullable=True)
    subjects = db.Column(db.JSON, nullable=True)
    source = db.Column(db.String, default="verified")
    
#------------RELATIONSHIPS-----------------
    # Multi-author support
    authors = relationship(
        "Users",
        secondary="book_authors",
        back_populates="authored_books",
        lazy="dynamic"
    )


    # Playlists that include this book
    playlists = relationship(
        "Playlists",
        secondary="playlist_books",
        back_populates="books",
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
    
    
    
    
#------------RELATIONSHIPS-----------------
    # Books included in this playlist
    books = relationship(
        "Books",
        secondary="playlist_books",
        back_populates="playlists",
        lazy="dynamic"
    )

    # Tags applied to this playlist
    tags = relationship(
        "Tags",
        secondary="playlist_tags",
        back_populates="playlists",
        lazy="dynamic"
    )

    playlist_songs = relationship(
        "Playlist_Songs",
        back_populates="playlist",
        cascade="all, delete-orphan",
        lazy="dynamic"
    )

    user = relationship(
        "Users", 
        back_populates="playlists", 
        lazy=True)
    
    @property
    def song_count(self):
        return self.playlist_songs.count()

    
#_____________SONGS_____________________
class Songs(db.Model):
    __tablename__ = 'songs'
    
    id = db.Column(db.Integer, primary_key=True)
    spotify_id = db.Column(db.String(250), nullable=False)
    title = db.Column(db.String(500), nullable=False)
    artists = db.Column(db.JSON, nullable=False) #storing as JSON to accommodate multiple artists
    album = db.Column(db.String(250), nullable=True)
    album_art = db.Column(db.String(500), nullable=True)
    preview_url = db.Column(db.String(500), nullable=True)
    audio_features = db.Column(db.JSON, nullable=True)
    genres = db.Column(db.JSON, nullable=True)
    source = db.Column(db.String(250), nullable=False, default="Spotify")

    playlist_songs = relationship(
            "Playlist_Songs",
            back_populates="song",
            cascade="all, delete-orphan",
            lazy="dynamic"
        )


#_____________TAGS_____________________
class Tags(db.Model):
    __tablename__ = 'tags'
    
    id = db.Column(db.Integer, primary_key=True)
    mood_name = db.Column(db.String(100), unique=True, nullable=False)
    category = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(db.DateTime(timezone=True), onupdate=func.now())


#------------RELATIONSHIPS-----------------
    
    
    playlists = relationship(
        "Playlists",
        secondary="playlist_tags",
        back_populates="tags",
        lazy="dynamic"
    )

#_____________ASSOCIATION TABLES_____________________
    
class Playlist_Songs(db.Model):
    __tablename__ = 'playlist_songs'

    id = db.Column(db.Integer, primary_key=True)
    playlist_id = db.Column(db.Integer, db.ForeignKey('playlists.id'), nullable=False)
    song_id = db.Column(db.Integer, db.ForeignKey('songs.id'), nullable=False)
    order_index = db.Column(db.Integer, nullable=True)

    playlist = relationship("Playlists", back_populates="playlist_songs")
    song = relationship("Songs", back_populates="playlist_songs")

    
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

    