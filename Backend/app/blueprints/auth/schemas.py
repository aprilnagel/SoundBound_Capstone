from marshmallow import Schema, fields
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
        from app.models import Users
        model = Users
        load_instance = False
        include_fk = True
        exclude = (
            "playlists", 
            "authored_books",
            "verification_requests")  # allow password on load but not on dump and prevent circular references.

signup_schema = SignupSchema()

#VALIDATION
#_____________LOGIN SCHEMA_____________________
#used for:
    # validating and deserializing login data

class LoginUserSchema(Schema):
    email = fields.Email(required=True)
    password = fields.String(required=True)

login_user_schema = LoginUserSchema()


