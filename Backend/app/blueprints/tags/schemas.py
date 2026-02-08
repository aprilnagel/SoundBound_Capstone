from marshmallow import Schema, fields

class TagBaseSchema(Schema):
    tag_id = fields.Int(required=True)

tag_base_schema = TagBaseSchema()



class TagDumpSchema(Schema):
    id = fields.Int()
    mood_name = fields.Str()
    category = fields.Str(required=False, allow_none=True)
    created_at = fields.DateTime()
    updated_at = fields.DateTime()

tag_dump_schema = TagDumpSchema()
tags_dump_schema = TagDumpSchema(many=True)