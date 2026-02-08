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
    isbn_list = fields.List(fields.Str())

book_dump_schema = BookDumpSchema()