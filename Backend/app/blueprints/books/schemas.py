from marshmallow import Schema, fields

class BookDumpSchema(Schema):
    id = fields.Int()
    openlib_id = fields.Str()
    title = fields.Str()
    author_names = fields.List(fields.Str())
    author_keys = fields.List(fields.Str())
    cover_url = fields.Str()
    cover_id = fields.Int()
    first_publish_year = fields.Str()
    subjects = fields.List(fields.Str())
    description = fields.Str()  # ⭐ ADD THIS
    isbn_list = fields.List(fields.Str())
    api_source = fields.Str()        # optional but recommended
    api_id = fields.Str()            # optional but recommended
    source = fields.Str()            # optional but recommended
    author_reco_playlist = fields.Raw()  # ⭐ Needed for your right column

    in_user_library = fields.Boolean()
    is_owned_by_author = fields.Boolean()


book_dump_schema = BookDumpSchema()

class BookLiteSchema(Schema):
    id = fields.Int()
    title = fields.Str()
    cover_url = fields.Str()
    source = fields.Str()  # "verified" or "custom"
    author_keys = fields.List(fields.Str())  # Needed to determine if author-reco is possible
    
book_lite_schema = BookLiteSchema()