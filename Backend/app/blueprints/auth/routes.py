from . import auth_bp
from .schemas import signup_schema, login_user_schema
from app.blueprints.users.schemas import UserSchema
from app.blueprints.auth.schemas import SignupSchema, signup_schema
from app.utility.auth import encode_token, token_required, require_role
from flask import request, jsonify
from app.models import Users
from marshmallow import ValidationError
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import limiter, db


#__________________1. USER SIGNUP_____________________
@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        # Only loads allowed fields from SignupSchema
        data = signup_schema.load(request.json)
    except ValidationError as err:
        return jsonify(err.messages), 400

    # Hash password
    hashed_pw = generate_password_hash(data["password"])

    # Create user with SAFE, WHITELISTED fields
    new_user = Users(
        first_name=data["first_name"],
        last_name=data["last_name"],
        username=data["username"],
        email=data["email"],
        password=hashed_pw,
        role="reader",              # force default
        openlib_author_key=None     # prevent injection
    )

    db.session.add(new_user)
    db.session.commit()

    # Use your canonical public user schema
    user_schema = UserSchema()
    return user_schema.jsonify(new_user), 201


#__________________2. USER LOGIN_____________________
@auth_bp.route('/login', methods=['POST'])
# @limiter.limit("10 per minute") # Limit to 10 login attempts per minute per IP
def login():
    try:
        data = login_user_schema.load(request.json) # Validate and deserialize input data using Marshmallow schema. Json > Python dictionary
    except ValidationError as err:
        return jsonify(err.messages), 400 # If validation fails, return error messages with a 400 Bad Request status code.
    user = Users.query.filter_by(email=data['email']).first() # Query the database for a user with the provided email.
    if user and check_password_hash(user.password, data['password']): # Check if the user exists and the password is correct.
        token = encode_token(user.id, user.role) # Generate an authentication token for the user.
        return jsonify({
            'token': token,
            "message": f"Welcome back, {user.first_name}!"}), 200 # Return the token as a JSON response with a 200 OK status code
    return jsonify({'message': 'Invalid email or password'}), 401 # If authentication fails, return an error message with a 401 Unauthorized status code.

#__________________3. USER ME (GET CURRENT USER)_____________________
# This route retrieves the current user's information based on the provided authentication token.
@auth_bp.route('/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    
    user_schema = UserSchema()  # Use the canonical UserSchema from the users blueprint

    return user_schema.jsonify(current_user), 200 # Return the current user's data as a JSON response with a 200 OK status code.


#__________________4. LOGOUT (FRONTEND HANDLED) (DEV ONLY)_____________________
@auth_bp.route('/logout', methods=['POST'])
@token_required
def logout(current_user):
    # Since we're using token-based authentication (JWT), logout is handled on the frontend by deleting the token.
    return jsonify({'message': 'Logout successful. Please delete the token on the client side.'}), 200