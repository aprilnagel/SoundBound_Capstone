from marshmallow import Schema, fields
from app.models import Users
from app.extensions import ma

#ONLY INPUT SCHEMAS

# Schemas validate and transform data.
    # meta tells them how.
    # load() is for input.
    # dump() is for output.



#_____________SIGNUP SCHEMA_____________________
#used for:
    # validating and deserializing signup data
    # returns a dictionary that can be used to create a new user

#Exclude fields that users should never set, like id, role, library, created_at, updated_at, playlists, authored_books, verification_requests, and author_keys. These are managed by the system and should not be provided by the user during signup. This tightens security and prevents users from manipulating critical fields that could lead to unauthorized access or data corruption.
class SignupSchema(ma.SQLAlchemyAutoSchema):
    class Meta:
        model = Users
        load_instance = False
        include_fk = False
        # Explicitly block fields users should NEVER set
        exclude = (
            "id",
            "role",
            "library",
            "created_at",
            "updated_at",
            "playlists",
            "authored_books",
            "verification_requests",
            "author_keys"
        )
        
signup_schema = SignupSchema()

#VALIDATION
#_____________LOGIN SCHEMA_____________________
#used for:
    # validating and deserializing login data

class LoginUserSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)

login_user_schema = LoginUserSchema()


