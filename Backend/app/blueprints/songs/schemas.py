from marshmallow import Schema, fields

class SongDumpSchema(Schema):
    id = fields.Int()
    title = fields.String()
    artists = fields.List(fields.String())
    album = fields.String()
    preview_url = fields.String()
    spotify_id = fields.String()
    source = fields.String()
    genres = fields.List(fields.String(), dump_default=[])
    audio_features = fields.Dict()

song_dump_schema = SongDumpSchema()
songs_dump_schema = SongDumpSchema(many=True)