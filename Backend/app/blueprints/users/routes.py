from email import message
from app.blueprints.users import users_bp
from app.blueprints.users.schemas import UserUpdateSchema, UserSchema, AuthorApplicationSchema, author_app_schema
from app.utility.auth import token_required, require_role
from flask import request, jsonify
from app.models import Users, db, Author_verification_requests as VerificationRequest
from marshmallow import ValidationError
from app.extensions import limiter
from werkzeug.security import generate_password_hash, check_password_hash


#________________LIBRARY ROUTES________________#

#------------------1. Add a book to library------------------#
#add a book to users library. Users search books and click "add to library" button. the library is a list of book IDs. book ids are assigned when books are added to the main book database. the actual book API is handled elsewhere.
@users_bp.route('/me/library', methods=['POST'])
@token_required
def add_book_to_library(current_user):
    """
    Add a book to the authenticated user's personal library.

    Request JSON:
        {
            "book_id": <string or int>
        }

    Behavior:
        - Ensures the user's library list exists.
        - Prevents duplicate entries.
        - Appends the book ID to the user's library.

    Returns:
        200 OK: Book successfully added.
        400 Bad Request: Missing book_id or duplicate entry.
    """
    try:
        book_id = request.json.get('book_id')
        if not book_id:
            return jsonify({'message': 'Book ID is required'}), 400
    except Exception as e:
        return jsonify({'message': 'Invalid input', 'error': str(e)}), 400

    # Ensure library exists
    if current_user.library is None:
        current_user.library = []

    # Prevent duplicates
    if book_id in current_user.library:
        return jsonify({'message': 'Book already in library'}), 400

    # Add book
    current_user.library.append(book_id)
    db.session.commit()

    return jsonify({'message': f'Book {book_id} added to library'}), 200


#------------------2. Remove a book from library------------------#
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
        if not book_id:
            return jsonify({'message': 'Book ID is required'}), 400
    except Exception as e:
        return jsonify({'message': 'Invalid input', 'error': str(e)}), 400

    # Ensure library exists
    if current_user.library is None:
        current_user.library = []

    # Check if book is in library
    if book_id not in current_user.library:
        return jsonify({'message': 'Book not found in library'}), 404

    # Remove book
    current_user.library.remove(book_id)
    db.session.commit()

    return jsonify({'message': f'Book {book_id} removed from library'}), 200


#------------------3. Get user's library------------------#
@users_bp.route('/me/library', methods=['GET'])
@token_required
def get_user_library(current_user):
    """
    Retrieve the authenticated user's library.

    Behavior:
        - Ensures the library list exists.
        - Returns the list of stored book IDs.

    Returns:
        200 OK: { "library": [...] }
    """

    # Ensure library exists
    if current_user.library is None:
        current_user.library = []

    return jsonify({'library': current_user.library}), 200


#________________USER PROFILE ROUTES________________#

#------------------1. Get current user's profile------------------#
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

#-------------------2. Update current user's profile------------------#
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

    from werkzeug.security import generate_password_hash
    from marshmallow import ValidationError

    # Use your update schema (must allow partial updates)
    user_update_schema = UserUpdateSchema(partial=True)

    try:
        update_data = user_update_schema.load(request.json, partial=True)
    except ValidationError as err:
        return jsonify(err.messages), 400

    # Apply updates
    for key, value in update_data.items():
        if key == "password":
            value = generate_password_hash(value)
        setattr(current_user, key, value)

    db.session.commit()

    # Return updated user
    user_schema = UserSchema()
    return jsonify(user_schema.dump(current_user)), 200


#________________LOOK UP/VIEW AUTHOR BY ID ROUTE________________#
#only authors have public profiles, so this route is for looking up an author by their user ID. If the user with that ID is not an author, we return a 404 since they don't have a public profile to view. This allows readers to view author profiles and bios, but not other readers' profiles.

#------------------1. Get author profile by ID------------------#
@users_bp.route('/<int:user_id>', methods=['GET'])
def get_public_user_profile(user_id):
    """
    Retrieve a public author profile by user ID.

    Behavior:
        - Returns 404 if the user does not exist.
        - Returns 404 if the user is not a verified author.
        - Combines user fields with approved author verification metadata.
        - Returns a complete public author profile.

    Returns:
        200 OK: Public author profile.
        404 Not Found: User not found or not an author.
    """

    user = Users.query.get_or_404(user_id)

    if user.role != 'author':
        return jsonify({"message": "This user does not have a public profile."}), 404

    # Fetch approved verification request
    approved_request = VerificationRequest.query.filter_by(
        user_id=user.id,
        status='approved'
    ).first()

    if not approved_request:
        return jsonify({"message": "Author profile metadata not found."}), 404

    # Build combined public profile
    public_profile = {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "username": user.username,
        "openlib_author_key": approved_request.openlib_author_key or user.openlib_author_key,
        "author_bio": approved_request.author_bio,
        "proof_links": approved_request.proof_links,
        "created_at": user.created_at,
    }

    return jsonify(public_profile), 200


#------------------UPDATE AUTHOR ROUTE------------------#
@users_bp.route('/me/author-profile', methods=['PUT'])
@token_required
def update_author_profile(current_user):
    """
    Update the authenticated author's public author profile information.

    Request JSON:
        {
            "author_bio": <string>,
            "openlib_author_key": <string>
        }

    Behavior:
        - Only authors can update their author profile.
        - Updates fields stored in the approved verification request.
        - Returns the updated author profile.
    """

    if current_user.role != 'author':
        return jsonify({"message": "Only authors can update their public profile."}), 403

    # Fetch the approved verification request
    approved_request = VerificationRequest.query.filter_by(
        user_id=current_user.id,
        status='approved'
    ).first()

    if not approved_request:
        return jsonify({"message": "No approved author profile found."}), 404

    data = request.json or {}

    # Update allowed fields
    if "author_bio" in data:
        approved_request.author_bio = data["author_bio"]

    if "openlib_author_key" in data:
        approved_request.openlib_author_key = data["openlib_author_key"]

    db.session.commit()

    return jsonify({
        "message": "Author profile updated successfully.",
        "author_profile": {
            "author_bio": approved_request.author_bio,
            "openlib_author_key": approved_request.openlib_author_key
        }
    }), 200


#________________AUTHOR APPLICATION ROUTES________________#

#------------------1. Apply to be an author------------------#
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
        openlib_author_key=validated.get("openlib_author_key"),
        notes=validated.get("notes"),
        status='pending'  # system-generated
    )

    db.session.add(new_request)
    db.session.commit()

    return jsonify({'message': 'Author application submitted successfully!'}), 200



#------------------2. View own author application status------------------#

@users_bp.route('/me/applications', methods=['GET'])
@token_required
@require_role('reader')
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

    # If the user has never submitted an application
    if not current_user.verification_requests:
        return jsonify({'message': 'You have not submitted any author applications.'}), 404

    # Return only safe, user-facing fields
    applications = [
        {
            "id": req.id,
            "status": req.status,
            "submitted_at": req.submitted_at
        }
        for req in current_user.verification_requests
    ]

    return jsonify({'applications': applications}), 200


#------------------3. View all author applications (admin)------------------#
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
        user = Users.query.get(app.user_id) #fetch user who submitted the app request.

        result.append({ #build dictionary 
            "application_id": app.id,
            "user_id": app.user_id,
            "user_email": user.email if user else "User not found",
            "author_bio": app.author_bio,
            "openlib_author_key": app.openlib_author_key,
            "proof_links": app.proof_links,
            "status": app.status,
            "submitted_at": app.submitted_at,
            "reviewed_at": app.reviewed_at,
            "reviewed_by": app.reviewed_by,
            "notes": app.notes
        })

    return jsonify({'applications': result}), 200 #return the python list of dictionaries as JSON response

#------------------4. View pending author applications (admin)------------------#
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
        results.append({
            "application_id": app.id,
            "user_id": app.user_id,
            "user_email": app.user.email,
            "user_name": f"{app.user.first_name} {app.user.last_name}",
            "author_bio": app.author_bio,
            "openlib_author_key": app.openlib_author_key,
            "proof_links": app.proof_links,
            "notes": app.notes,
            "status": app.status,
            "submitted_at": app.submitted_at
        })
        

    return jsonify({"pending_applications": results}), 200


#------------------5. Approve author application (admin)------------------#
@users_bp.route('/<int:user_id>/approve-author', methods=['PUT'])
@token_required
@require_role('admin')
def approve_author_application(current_user, user_id):
    """
    Approve a user's pending author verification request (admin only).

    Behavior:
        - Ensures the user exists and is not already an author.
        - Ensures a pending request exists.
        - Promotes the user to author.
        - Updates the verification request with approval metadata.

    Returns:
        200 OK: User approved.
        400 Bad Request: Already an author.
        404 Not Found: No pending request.
    """

    user = Users.query.get_or_404(user_id)

    if user.role == 'author':
        return jsonify({'message': 'User is already an author!'}), 400

    pending_request = VerificationRequest.query.filter_by(user_id=user_id, status='pending').first()
    if not pending_request:
        return jsonify({'message': 'No pending author application found for this user!'}), 404

    # Update user role to author
    user.role = 'author'
    db.session.commit()

    # Update verification request status
    pending_request.status = 'approved'
    pending_request.reviewed_at = db.func.now()
    pending_request.reviewed_by = current_user.id
    db.session.commit()

    return jsonify({'message': f'User {user.email} has been approved as an author!'}), 200

#------------------6. Reject author application (admin)------------------#
@users_bp.route('/<int:user_id>/reject-author', methods=['PUT'])
@token_required
@require_role('admin')
def reject_author_application(current_user, user_id):
    """
    Reject a user's pending author verification request (admin only).

    Behavior:
        - Ensures the user exists and is not already an author.
        - Ensures a pending request exists.
        - Updates the verification request with rejection metadata.

    Returns:
        200 OK: User rejected.
        400 Bad Request: User already an author.
        404 Not Found: No pending request.
    """

    user = Users.query.get_or_404(user_id)

    if user.role == 'author':
        return jsonify({'message': 'User is already an author and cannot be rejected!'}), 400

    pending_request = VerificationRequest.query.filter_by(user_id=user_id, status='pending').first()
    if not pending_request:
        return jsonify({'message': 'No pending author application found for this user!'}), 404

    # Update verification request status to rejected
    pending_request.status = 'rejected'
    pending_request.reviewed_at = db.func.now()
    pending_request.reviewed_by = current_user.id
    db.session.commit()

    return jsonify({'message': f'User {user.email}\'s author application has been rejected.'}), 200

#_____________________AUTHOR LIST ROUTE_____________________#

#------------------1. Get list of all authors------------------#
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
