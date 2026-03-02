
from app.blueprints.users import users_bp
from app.blueprints.users.schemas import UserUpdateSchema, UserSchema, AuthorApplicationSchema, author_app_schema
from app.blueprints.auth.schemas import signup_schema
from app.utility.auth import token_required, require_role
from flask import request, jsonify
from app.models import Books, Playlist_Books, Playlists, Users, Author_verification_requests as VerificationRequest
from app.extensions import db
from marshmallow import ValidationError
from app.extensions import limiter
from werkzeug.security import generate_password_hash, check_password_hash
from app.blueprints.books.schemas import book_dump_schema
from app.blueprints.playlists.schemas import playlist_dump_schema
from flask_cors import cross_origin


#________________USER PROFILE ROUTES________________#
            # - All roles have the same access. 
            # - Role dependent fields (front end will handle)

#
# ============================================================
# 1. GET CURRENT USER PROFILE
# ============================================================
# USED FOR: Retrieving the profile information of the currently authenticated user
@users_bp.route('/me', methods=['GET'])
@token_required
def get_current_user_profile(current_user):
    
    user_schema = UserSchema()
    return jsonify(user_schema.dump(current_user)), 200

#______________________________DELETE ACCOUNT___________________________
#______________________________DELETE ACCOUNT___________________________
@users_bp.route('/me', methods=['DELETE'])
@token_required
def delete_current_user(current_user):

    # Fetch the Deleted User (ID = 0)
    deleted_user = Users.query.get(0)
    if not deleted_user:
        return jsonify({'error': 'Deleted User account not found. Contact support.'}), 500

    # Reassign all playlists owned by this user
    Playlists.query.filter_by(user_id=current_user.id).update({
        "user_id": 0
    })

    # Delete the user entirely
    db.session.delete(current_user)
    db.session.commit()

    return jsonify({'message': 'Your account has been deleted.'}), 200


# ============================================================
# 2. UPDATE CURRENT USER PROFILE
# ============================================================
# USED FOR: Updating the profile information of the currently authenticated user
@users_bp.route('/me', methods=['PUT'])
@token_required
def update_current_user(current_user):
    
    # Use update schema (must allow partial updates)
    user_update_schema = UserUpdateSchema(partial=True)

    try:
        update_data = user_update_schema.load(request.json, partial=True)
    except ValidationError as err:
        return jsonify(err.messages), 400
    
    #block readers from updating author_bio. They shouldn't see it anyway, but just in case they try to update it via API call, we want to prevent that since its an author-only field.
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
        
# ============================================================
# 2. REMOVE A BOOK FROM LIBRARY
# ============================================================

@users_bp.route('/me/library', methods=['DELETE'])
@token_required
def remove_book_from_library(current_user):

    try:
        book_id = request.json.get('book_id')
        if book_id is None:
            return jsonify({'message': 'Book ID is required'}), 400
    except Exception as e:
        return jsonify({'message': 'Invalid input', 'error': str(e)}), 400

    # Convert to int because library stores integers
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
    current_user.library = [b for b in current_user.library if b != book_id] #list comprehension instead of normal for loop to create new list without the removed book ID. nice and concise. Also avoids mutating the existing list which can cause issues with SQLAlchemy change tracking.

    db.session.commit()

    return jsonify({'message': f'Book {book_id} removed from library'}), 200



# ============================================================
# 3. GET USER'S LIBRARY
# ============================================================
@users_bp.route('/me/library', methods=['GET'])
@token_required
@cross_origin(supports_credentials=True)
def get_user_library(current_user):

    # Ensure library exists
    if current_user.library is None:
        current_user.library = []
        db.session.commit()

    # Fetch full book objects
    books = Books.query.filter(Books.id.in_(current_user.library)).all()

    serialized = []

    #For loop:
    for book in books:
        
        # Base book data
        book_dict = book_dump_schema.dump(book)

        #  Adding fields needed for author-reco logic
        book_dict["source"] = book.source
        book_dict["author_keys"] = book.author_keys

        # SAFE HANDLING OF AUTHOR KEYS
        # Users may have NO author_keys (normal)
        # Some older books may also have None
        user_keys = current_user.author_keys or []
        book_keys = book.author_keys or []

        book_dict["can_author_reco"] = (
            book.source == "verified"
            and any(key in user_keys for key in book_keys)
        )

        #CHECK PLAYLISTS FOR THIS BOOK (PERSONAL OR AUTHOR RECO) TO INFORM FRONTEND DISPLAY
        # PERSONAL PLAYLIST
        user_playlist = (
            Playlists.query
            .filter(
                Playlists.user_id == current_user.id,
                (Playlists.is_author_reco == False) | (Playlists.is_author_reco.is_(None))
            )
            .join(Playlist_Books, Playlist_Books.playlist_id == Playlists.id)
            .filter(Playlist_Books.book_id == book.id)
            .first()
        )

        book_dict["user_playlist_id"] = user_playlist.id if user_playlist else None

        # AUTHOR RECO PLAYLIST
        author_reco = (
            Playlists.query
            .filter(
                Playlists.user_id == current_user.id,
                Playlists.is_author_reco == True
            )
            .join(Playlist_Books, Playlist_Books.playlist_id == Playlists.id)
            .filter(Playlist_Books.book_id == book.id)
            .first()
        )

        book_dict["author_reco_playlist"] = (
            playlist_dump_schema.dump(author_reco) if author_reco else None
        )

        serialized.append(book_dict)

    return jsonify({'library': serialized}), 200


#________________AUTHOR APPLICATION ROUTES________________#

# ============================================================
# 1. APPLY TO BE AN AUTHOR
# ============================================================
@users_bp.route('/apply-author', methods=['POST'])
@token_required
def apply_to_be_author(current_user):

    # Authors cannot reapply
    if current_user.role == 'author':
        return jsonify({'message': 'You are already an author!'}), 400

    # Prevent multiple pending applications
    if current_user.verification_requests and any(req.status == 'pending' for req in current_user.verification_requests):
        return jsonify({'message': 'You already have a pending author application!'}), 400

    # Validate input using your schema
    #{} is there so marshmallow doesn't explode when it tries to load an empty body. 
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



# ============================================================
# 2. VIEW OWN AUTHOR APPLICATION STATUS
# ============================================================
@users_bp.route('/me/applications', methods=['GET'])
@token_required
def view_own_author_application_status(current_user):

    requests = current_user.verification_requests.all()
    # If the user has never submitted an application
    if not requests:
        return jsonify({'message': 'You have not submitted any author applications.'}), 404

    # Return only safe, user-facing fields
    applications = [
        {
            "id": req.id,
            "status": req.status,
            "submitted_at": req.submitted_at,
            "reviewed_at": req.reviewed_at,
            "reviewed_by": req.reviewed_by,
            "reviewed_by_username": req.reviewer.username if req.reviewer else None,

        }
        for req in requests
    ]

    return jsonify({'applications': applications}), 200


# ============================================================
# 3. VIEW ALL AUTHOR APPLICATIONS (ADMIN)
# ============================================================
@users_bp.route('/author-applications', methods=['GET'])
@token_required
@require_role('admin')
def view_all_author_applications(current_user):

    applications = VerificationRequest.query.all()
    result = [] #empty list to hold application requests with user info

    for app in applications: #looping through each app request
        user = app.user #get the user associated with the application request. 
        

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

# ============================================================
# 4. VIEW PENDING AUTHOR APPLICATIONS (ADMIN)
# ============================================================
@users_bp.route('/author-applications/pending', methods=['GET'])
@token_required
@require_role('admin')
def get_pending_author_applications(current_user):

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

# ============================================================
# 5. GET ONE AUTHOR APPLICATION BY ID (ADMIN)
# ============================================================
@users_bp.route('/author-applications/<int:application_id>', methods=['GET'])
@token_required
def get_author_application_by_id(current_user, application_id):

    app = VerificationRequest.query.get_or_404(application_id)
    user = app.user

    # 🔒 SECURITY CHECK. Only accessible for admin
    if app.user_id != current_user.id and current_user.role != "admin":
        return jsonify({"error": "Unauthorized"}), 403

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


# ============================================================
# 5. APPROVE AUTHOR APPLICATION (ADMIN)
# ============================================================
@users_bp.route('/<int:user_id>/approve-author', methods=['PUT'])
@token_required
@require_role('admin')
def approve_author_application(current_user, user_id):
    

    user = Users.query.get_or_404(user_id)

    #Security check: if user is already an author, they can't be approved again.
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

# ============================================================
# 6. REJECT AUTHOR APPLICATION (ADMIN)
# ============================================================
@users_bp.route('/<int:user_id>/reject-author', methods=['PUT'])
@token_required
@require_role('admin')
def reject_author_application(current_user, user_id):
    
    #Security check: if user is already an author, they can't be rejected.
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

# ============================================================
# 7. GET LIST OF ALL AUTHORS (ADMIN) (DORMANT, CAN BE USED FOR FRONTEND AUTHOR DIRECTORY)
# ============================================================
@users_bp.route('/authors', methods=['GET'])
def get_all_authors():
    
    authors = Users.query.filter_by(role='author').all()
    user_schema = UserSchema(many=True)
    return jsonify(user_schema.dump(authors)), 200
