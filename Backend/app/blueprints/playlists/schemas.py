from marshmallow import Schema, fields, validate
from app.blueprints.users.schemas import UserPublicSchema


class PlaylistBaseSchema(Schema):
    title = fields.String(required=True, validate=validate.Length(min=1))
    description = fields.String(allow_none=True)

    # book selection (verified or author-reco)
    book_id = fields.Int(allow_none=True)

    # custom book fields (for user-created playlists without verified book)
    custom_book_title = fields.String(allow_none=True)
    custom_author_name = fields.String(allow_none=True)
    
    # author recommendation toggle
    is_author_reco = fields.Boolean(load_default=False)

playlist_schema = PlaylistBaseSchema()

class PlaylistUpdateSchema(Schema):
    title = fields.String(validate=validate.Length(min=1))
    description = fields.String(allow_none=True)
    is_public = fields.Boolean()

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
    books = fields.List(fields.Nested("BookDumpSchema"))

    # minimal nested user
    user = fields.Nested(UserPublicSchema, only=("id", "username"))

playlist_dump_schema = PlaylistDumpSchema()
playlists_dump_schema = PlaylistDumpSchema(many=True)

class PlaylistSongBaseSchema(Schema):
    song_id = fields.Int(required=True)

playlist_song_schema = PlaylistSongBaseSchema()

class PlaylistSongDumpSchema(Schema):
    id = fields.Int()
    order_index = fields.Int()
    song = fields.Nested("SongDumpSchema")

playlist_song_dump_schema = PlaylistSongDumpSchema()

class PlaylistDetailSchema(PlaylistDumpSchema):
    songs = fields.List(fields.Nested(PlaylistSongDumpSchema))
    tags = fields.List(fields.Nested("TagDumpSchema"), dump_default=[])

playlist_detail_schema = PlaylistDetailSchema()
playlists_detail_schema = PlaylistDetailSchema(many=True)
