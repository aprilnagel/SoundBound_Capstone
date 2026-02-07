from marshmallow import Schema, fields
from app.models import Users
from app.extensions import ma


# Schemas validate and transform data.
    # meta tells them how.
    # load() is for input.
    # dump() is for output.



#_____________SIGNUP SCHEMA_____________________
#used for:
    # validating and deserializing signup data
    # returns a dictionary that can be used to create a new user

#CREATING USER (LOAD) includes password
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
            "verification_requests"
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


