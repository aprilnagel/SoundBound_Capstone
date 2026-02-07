from marshmallow import Schema, fields

class TagBaseSchema(Schema):
    tag_id = fields.Int(required=True)

tag_base_schema = TagBaseSchema()

class TagDumpSchema(Schema):
    id = fields.Int()
    name = fields.Str()

tag_dump_schema = TagDumpSchema()