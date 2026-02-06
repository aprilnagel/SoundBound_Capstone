from marshmallow import Schema, fields, validate
from app.extensions import ma
from app.models import Users



#_____________USER SCHEMA_____________________
#used for: 
    #  serializing and deserializing user data - meaning sending back to the  frontend.
    #  /me endpoint, when the backend needs to send user info to the frontend

#SERIALIZATION (dump) excludes password for security reasons
class UserSchema(ma.SQLAlchemyAutoSchema): 
    class Meta:
        from app.models import Users
        model = Users
        load_instance = True
        include_fk = True
        include_relationships = True
        exclude = (
            "playlists",
            "verification_requests",
            "authored_books",
        ) # Exclude relationships and sensitive fields in order to prevent circular references and data leaks.

user_schema = UserSchema()
users_schema = UserSchema(many=True)

#_____________USER UPDATE SCHEMA_____________________
#used for:
    # validating and deserializing user update data
    # allows partial updates, so all fields are optional
class UserUpdateSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Users
        fields = ("first_name", "last_name", "email", "password")
        load_only = ("password",)
        partial = True  # Allow partial updates
        
user_update_schema = UserUpdateSchema()


class AuthorApplicationSchema(Schema):
    class Meta:
        unknown = "EXCLUDE"
    author_bio = fields.String(required=True, validate=validate.Length(min=10))
    proof_links = fields.List(fields.String(), required=False)
    openlib_author_key = fields.String(required=False)
    notes = fields.String(required=False)
    
author_app_schema = AuthorApplicationSchema()
