from marshmallow import Schema, fields

class BookDumpSchema(Schema):
    id = fields.Int()
    work_key = fields.Str()
    title = fields.Str()
    author_names = fields.List(fields.Str())
    openlib_author_keys = fields.List(fields.Str())
    cover_url = fields.Str()
    publish_year = fields.Int()
    subjects = fields.List(fields.Str())
    isbn_list = fields.List(fields.Str())
    
book_dump_schema = BookDumpSchema()
