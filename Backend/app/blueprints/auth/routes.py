from . import auth_bp
from .schemas import signup_schema, login_user_schema
from app.blueprints.users.schemas import UserSchema
from app.utility.auth import encode_token, token_required, require_role
from flask import request, jsonify
from app.models import db, Users
from marshmallow import ValidationError
from werkzeug.security import generate_password_hash, check_password_hash
from app.extensions import limiter


#__________________1. USER SIGNUP_____________________
@auth_bp.route('/signup', methods=['POST'])
# @limiter.limit("5 per minute") # Limit to 5 signup attempts per minute per IP
def signup():
    try:
        data = signup_schema.load(request.json)  # Validate and deserialize input data using Marshmallow schema. Json > Python dictionary
    except ValidationError as err:
        return jsonify(err.messages), 400  # If validation fails, return error messages with a 400 Bad Request status code.
    
    data['password'] = generate_password_hash(data['password'])  # Hash the password before storing it in the database for security.
    
    new_user = Users(**data)  # Create a new user instance using the validated data.
    db.session.add(new_user)  # Add the new user to the database session.
    db.session.commit()  # Commit the session to save the new user to the database.

    user_schema = UserSchema()  # Use the canonical UserSchema from the users blueprint
    return user_schema.jsonify(new_user), 201  # Return the newly created user as a JSON response with a 201 Created status code.


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