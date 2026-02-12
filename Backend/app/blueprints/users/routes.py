
from app.blueprints.users import users_bp
from app.blueprints.users.schemas import UserUpdateSchema, UserSchema, AuthorApplicationSchema, author_app_schema
from app.blueprints.auth.schemas import signup_schema
from app.utility.auth import token_required, require_role
from flask import request, jsonify
from app.models import Books, Users, Author_verification_requests as VerificationRequest
from app.extensions import db
from marshmallow import ValidationError
from app.extensions import limiter
from werkzeug.security import generate_password_hash, check_password_hash
from app.blueprints.books.schemas import book_dump_schema


#________________USER PROFILE ROUTES________________#
            # - All roles have the same access. 
            # - Role dependent fields (front end will handle)

#✅------------------1. Get current user's profile------------------#
@users_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_profile(current_user):
    """
    Retrieve the authenticated user's full profile.

    Behavior:
        - Serializes the user using UserSchema.
        - Returns all non-sensitive user fields.

    Returns:
        200 OK: Serialized user profile.
    """

    user_schema = UserSchema()
    return jsonify(user_schema.dump(current_user)), 200

#✅-------------------2. Update current user's profile------------------#
@users_bp.route('/me', methods=['PUT'])
@token_required
def update_current_user(current_user):
    """
    Update the authenticated user's profile.

    Request JSON:
        Any subset of fields allowed by UserUpdateSchema.

    Behavior:
        - Validates input using Marshmallow.
        - Hashes password if provided.
        - Applies partial updates to the user model.

    Returns:
        200 OK: Updated user profile.
        400 Bad Request: Validation errors.
    """
    # Use your update schema (must allow partial updates)
    user_update_schema = UserUpdateSchema(partial=True)

    try:
        update_data = user_update_schema.load(request.json, partial=True)
    except ValidationError as err:
        return jsonify(err.messages), 400
    
    #block readers from updating author_bio. They shouldnt see it anyway, but just in case they try to update it via API call, we want to prevent that since its an author-only field.
    if 'author_bio' in update_data and current_user.role != 'author':
        return jsonify({'error': 'Only authors can update their author bio.'}), 403

    # Apply updates
    for key, value in update_data.items():
        if key == "password":
            value = generate_password_hash(value)
        setattr(current_user, key, value)

    db.session.commit()

    # Return updated user
    user_schema = UserSchema()
    return jsonify(user_schema.dump(current_user)), 200



#________________LIBRARY ROUTES________________#

        # - Library = internal
            # - Users can add/remove books to their library (list of book IDs)
            



#✅------------------2. Remove a book from library------------------#

@users_bp.route('/me/library', methods=['DELETE'])
@token_required
def remove_book_from_library(current_user):
    """
    Remove a book from the authenticated user's library.

    Request JSON:
        {
            "book_id": <string or int>
        }

    Behavior:
        - Ensures the library exists.
        - Validates that the book is present.
        - Removes the book ID from the library list.

    Returns:
        200 OK: Book removed.
        404 Not Found: Book not in library.
    """

    try:
        book_id = request.json.get('book_id')
        if book_id is None:
            return jsonify({'message': 'Book ID is required'}), 400
    except Exception as e:
        return jsonify({'message': 'Invalid input', 'error': str(e)}), 400

    # Convert to int because your library stores integers
    try:
        book_id = int(book_id)
    except ValueError:
        return jsonify({'message': 'Book ID must be an integer'}), 400

    # Ensure library exists
    if current_user.library is None:
        current_user.library = []

    # Validate presence
    if book_id not in current_user.library:
        return jsonify({'message': 'Book not found in library'}), 404

    # REASSIGN instead of mutating
    current_user.library = [b for b in current_user.library if b != book_id]

    db.session.commit()

    return jsonify({'message': f'Book {book_id} removed from library'}), 200



#✅------------------3. Get user's library------------------#
@users_bp.route('/me/library', methods=['GET'])
@token_required
def get_user_library(current_user):
    """
    Retrieve the authenticated user's library with full book objects.
    """

    # Ensure library exists
    if current_user.library is None:
        current_user.library = []
        db.session.commit()

    # Fetch full book objects
    books = Books.query.filter(Books.id.in_(current_user.library)).all()

    # Serialize using your schema (THIS is what includes cover_id)
    serialized = book_dump_schema.dump(books, many=True)

    return jsonify({'library': serialized}), 200




#________________AUTHOR APPLICATION ROUTES________________#

#✅------------------1. Apply to be an author------------------#
@users_bp.route('/apply-author', methods=['POST'])
@token_required
def apply_to_be_author(current_user):
    """
    Submit a full author verification request.
    User provides only their fields.
    System generates all lifecycle fields.
    """

    # Authors cannot reapply
    if current_user.role == 'author':
        return jsonify({'message': 'You are already an author!'}), 400

    # Prevent multiple pending applications
    if current_user.verification_requests and any(req.status == 'pending' for req in current_user.verification_requests):
        return jsonify({'message': 'You already have a pending author application!'}), 400

    # Validate input using your schema
    data = request.get_json() or {}
    validated = author_app_schema.load(data)

    # Create new verification request with system-owned fields
    new_request = VerificationRequest(
        user_id=current_user.id,
        author_bio=validated.get("author_bio"),
        proof_links=validated.get("proof_links"),
        author_keys=validated.get("author_keys"),
        notes=validated.get("notes"),
        status='pending'  # system-generated
    )

    db.session.add(new_request)
    db.session.commit()

    return jsonify({'message': 'Author application submitted successfully!'}), 200



#✅------------------2. View own author application status------------------#

@users_bp.route('/me/applications', methods=['GET'])
@token_required
def view_own_author_application_status(current_user):
    """
    View all author verification requests submitted by the authenticated user.

    Behavior:
        - Returns only user-safe fields (no admin-only data).
        - Returns 404 if the user has never applied.

    Returns:
        200 OK: List of applications.
        404 Not Found: No applications submitted.
    """
    requests = current_user.verification_requests.all()
    # If the user has never submitted an application
    if not requests:
        return jsonify({'message': 'You have not submitted any author applications.'}), 404

    # Return only safe, user-facing fields
    applications = [
        {
            "id": req.id,
            "status": req.status,
            "submitted_at": req.submitted_at
        }
        for req in requests
    ]

    return jsonify({'applications': applications}), 200


#✅------------------3. View all author applications (admin)------------------#
@users_bp.route('/author-applications', methods=['GET'])
@token_required
@require_role('admin')
def view_all_author_applications(current_user):
    """
    Retrieve all author verification requests (admin only).

    Behavior:
        - Includes user email and all admin-only fields.
        - Returns full moderation context for each application.

    Returns:
        200 OK: List of all verification requests with user info.
    """

    applications = VerificationRequest.query.all()
    result = [] #empty list to hold application requests with user info

    for app in applications: #looping through each app request
        user = app.user #get the user associated with the app request
        

        result.append({ #build dictionary 
            "application_id": app.id,
            "user_id": app.user_id,
            "first_name": user.first_name if user else "User not found",
            "last_name": user.last_name if user else "User not found",
            "full_name": f"{user.first_name} {user.last_name}" if user else "User not found",
            "username": user.username if user else "User not found",
            "email": user.email if user else "User not found",
            "author_bio": app.author_bio,
            "author_keys": app.author_keys,
            "proof_links": app.proof_links,
            "status": app.status,
            "submitted_at": app.submitted_at,
            "reviewed_at": app.reviewed_at,
            "reviewed_by": app.reviewed_by,
            "notes": app.notes
        })

    return jsonify({'applications': result}), 200 #return the python list of dictionaries as JSON response

#✅------------------4. View pending author applications (admin)------------------#
@users_bp.route('/author-applications/pending', methods=['GET'])
@token_required
@require_role('admin')
def get_pending_author_applications(current_user):
    """
    Retrieve all pending author verification requests (admin only).

    Behavior:
        - Returns full moderation context for each pending application.
        - Includes user info (email, name) for admin review.
        - Returns 200 with an empty list if no pending apps exist.

    Returns:
        200 OK: List of pending applications.
    """

    pending_apps = VerificationRequest.query.filter_by(status='pending').all()
    
    if not pending_apps:
        return jsonify({"message": "There are no pending author applications."}), 200


    results = []
    for app in pending_apps:
        user = app.user
        results.append({
            "application_id": app.id,
            "user_id": app.user_id,
            "first_name": user.first_name if user else "User not found",
            "last_name": user.last_name if user else "User not found",
            "full_name": f"{user.first_name} {user.last_name}" if user else "User not found",
            "username": user.username if user else "User not found",
            "email": user.email if user else "User not found",
            "author_bio": app.author_bio,
            "author_keys": app.author_keys,
            "proof_links": app.proof_links,
            "notes": app.notes,
            "status": app.status,
            "submitted_at": app.submitted_at
        })
        

    return jsonify({"pending_applications": results}), 200

#--------------------Get one author application by ID (admin)------------------#
@users_bp.route('/author-applications/<int:application_id>', methods=['GET'])
@token_required
@require_role('admin')
def get_author_application_by_id(current_user, application_id):
    """
    Retrieve a specific author verification request by its ID (admin only).

    Behavior:
        - Returns 404 if the application does not exist.
        - Includes full moderation context and user info for the application.

    Returns:
        200 OK: Application details with user info.
        404 Not Found: Application not found.
    """

    app = VerificationRequest.query.get_or_404(application_id)
    user = app.user


    result = {
        "application_id": app.id,
        "user_id": app.user_id,
        "email": user.email if user else "User not found",
        "first_name": user.first_name if user else "User not found",
        "last_name": user.last_name if user else "User not found",
        "full_name": f"{user.first_name} {user.last_name}" if user else "User not found",
        "username": user.username if user else "User not found",
        "author_bio": app.author_bio,
        "author_keys": app.author_keys,
        "proof_links": app.proof_links,
        "status": app.status,
        "submitted_at": app.submitted_at,
        "reviewed_at": app.reviewed_at,
        "reviewed_by": app.reviewed_by,
        "notes": app.notes
    }

    return jsonify(result), 200

#✅------------------5. Approve author application (admin)------------------#
@users_bp.route('/<int:user_id>/approve-author', methods=['PUT'])
@token_required
@require_role('admin')
def approve_author_application(current_user, user_id):
    """
    Approve a user's pending author verification request (admin only).
    """

    user = Users.query.get_or_404(user_id)

    if user.role == 'author':
        return jsonify({'message': 'User is already an author!'}), 400

    pending_request = VerificationRequest.query.filter_by(
        user_id=user_id, 
        status='pending'
    ).first()

    if not pending_request:
        return jsonify({'message': 'No pending author application found for this user!'}), 404

    # Promote user + update request
    user.role = 'author'
    user.author_keys = pending_request.author_keys #copy author keys from the request to the user model when approving
    user.author_bio = pending_request.author_bio #copy author bio from the request to the user model when approving
    pending_request.status = 'approved'
    pending_request.reviewed_at = db.func.now()
    pending_request.reviewed_by = current_user.id

    db.session.commit()

    return jsonify({'message': f'User {user.email} has been approved as an author!'}), 200

#✅------------------6. Reject author application (admin)------------------#
@users_bp.route('/<int:user_id>/reject-author', methods=['PUT'])
@token_required
@require_role('admin')
def reject_author_application(current_user, user_id):
    """
    Reject a user's pending author verification request (admin only).
    """

    user = Users.query.get_or_404(user_id)

    if user.role == 'author':
        return jsonify({'message': 'User is already an author and cannot be rejected!'}), 400

    pending_request = VerificationRequest.query.filter_by(
        user_id=user_id,
        status='pending'
    ).first()

    if not pending_request:
        return jsonify({'message': 'No pending author application found for this user!'}), 404

    # Update verification request status
    pending_request.status = 'rejected'
    pending_request.reviewed_at = db.func.now()
    pending_request.reviewed_by = current_user.id

    db.session.commit()

    return jsonify({'message': f"User {user.email}'s author application has been rejected."}), 200

#_____________________AUTHOR LIST ROUTE_____________________# #MAY NOT USE THIS, DEPENDS ON FRONTEND DESIGN. IF WE HAVE A PUBLIC AUTHOR DIRECTORY PAGE, THIS WILL BE USEFUL. IF NOT, MAYBE NOT NEEDED. CAN ALSO IMPLEMENT LATER IF WE DECIDE TO ADD AN AUTHOR DIRECTORY PAGE.could use it for internal stats or future features even if we don't have a public author directory page, so might be worth implementing regardless.

#✅------------------1. Get list of all authors (admin)------------------#
@users_bp.route('/authors', methods=['GET'])
def get_all_authors():
    """
    Retrieve all verified authors.

    Behavior:
        - Filters users by role='author'.
        - Serializes authors using UserSchema.

    Returns:
        200 OK: List of verified authors.
    """

    authors = Users.query.filter_by(role='author').all()
    user_schema = UserSchema(many=True)
    return jsonify(user_schema.dump(authors)), 200
