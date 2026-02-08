
from marshmallow import Schema, ValidationError, fields, validate, validates_schema
from app.blueprints.users.schemas import UserPublicSchema
from app.blueprints.books.schemas import BookLiteSchema



class PlaylistBaseSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String(allow_none=True)

    # book selection (verified or author-reco)
    book_id = fields.Int(allow_none=True)

    # custom book fields (for user-created playlists without verified book)
    custom_book_title = fields.String()
    custom_author_name = fields.String()
    custom_publish_year = fields.Int(allow_none=True)
    

    # author recommendation toggle
    is_author_reco = fields.Boolean(load_default=False)

    @validates_schema
    def validate_custom_vs_verified(self, data, **kwargs):
        book_id = data.get("book_id")
        custom_title = data.get("custom_book_title")
        custom_author = data.get("custom_author_name")

        # Case 1 — Verified playlist
        if book_id:
            if custom_title or custom_author:
                raise ValidationError(
                    "Cannot provide custom book fields when book_id is present."
                )
            return

        # Case 2 — Custom playlist
        if not custom_title or not custom_author:
            raise ValidationError(
                "custom_book_title and custom_author_name are required when book_id is not provided."
            )

playlist_schema = PlaylistBaseSchema()

class PlaylistUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(min=1))
    description = fields.String(allow_none=True)
    is_public = fields.Boolean()
    is_author_reco = fields.Boolean()

playlist_update_schema = PlaylistUpdateSchema()

class PlaylistDumpSchema(Schema):
    id = fields.Int()
    title = fields.String()
    description = fields.String()
    is_public = fields.Boolean()
    is_author_reco = fields.Boolean()
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

    # verified or author-reco playlists
    books = fields.Nested(BookLiteSchema, many=True)


    # minimal nested user
    user = fields.Nested(UserPublicSchema, only=("id", "username"))

playlist_dump_schema = PlaylistDumpSchema()
playlists_dump_schema = PlaylistDumpSchema(many=True)

class PlaylistSongBaseSchema(Schema):
    spotify_id = fields.String(required=True)

playlist_song_schema = PlaylistSongBaseSchema()

class PlaylistSongDumpSchema(Schema):
    id = fields.Int()
    order_index = fields.Int()
    song = fields.Nested("SongDumpSchema")

playlist_song_dump_schema = PlaylistSongDumpSchema()

class PlaylistDetailSchema(PlaylistDumpSchema):
    playlist_songs = fields.List(fields.Nested(PlaylistSongDumpSchema))
    tags = fields.List(fields.Nested("TagDumpSchema"), dump_default=[])

playlist_detail_schema = PlaylistDetailSchema()
playlists_detail_schema = PlaylistDetailSchema(many=True)
