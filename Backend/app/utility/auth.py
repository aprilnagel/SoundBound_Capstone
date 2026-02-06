from datetime import datetime, timedelta, timezone
from jose import jwt
import jose
from functools import wraps
from flask import request, jsonify
import os

from app.models import Users

SECRET_KEY = os.getenv("SECRET_KEY") or "supersecretkey"
ALGORITHM = "HS256"

#______________TOKEN ENCODING_____________________


def encode_token(user_id, role):
    payload = {
        'exp': datetime.now(tz=timezone.utc) + timedelta(days=1),
        'iat': datetime.now(tz=timezone.utc),
        'sub': str(user_id), #VERY IMPORTANT, SET THE USER ID AS A STRING
        'role': role #WILL HAVE DIFFERENT ROLES (E.G., 'reader', 'admin', 'author')
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token

#--------------TOKEN DECORATORS-----------------

#______________1. TOKEN REQUIREMENT DECORATOR_____________________

def token_required(f): #main function
    
    @wraps(f) #secondary function to preserve the original function's metadata
    def decorator(*args, **kwargs):
        token = None
        
        if 'Authorization' in request.headers:
            token = request.headers['Authorization'].split()[1] # assuming the bearer token format removes "Bearer " from the header value, leaving index 1 as the token
            
        if not token:
            return jsonify({'message': 'Token is missing!'}), 401 #the info comes back as a json object with a 401 status code (unauthorized). must jsonify the message back to python dictionary format.
        
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            request.logged_in_user_id = data['sub'] #the user ID is stored in the "sub" field of the token payload, and we attach it to the request object for later use in the route function.
            request.logged_in_user_role = data['role'] #the user role is stored in the "role" field of the token payload, and we attach it to the request object for later use in the route function.
        except jose.exceptions.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired!'}), 401
        except jose.exceptions.JWTError:
            return jsonify({'message': 'Invalid token!'}), 401
        
        
        current_user = Users.query.get(request.logged_in_user_id)
        
        if not current_user:
            return jsonify({'message': 'User not found!'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorator
        
#_______________ROLE-BASED ACCESS DECORATORS_____________________

#so for routes, we will drop in the roles when using the required decorator like @require_role("admin"), @require_role("author", "admin"), etc.

def require_role(*roles):
    def wrapper(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            if request.logged_in_user_role not in roles:
                return jsonify({'message': 'Access forbidden: insufficient permissions!'}), 403 #403 Forbidden status code for insufficient permissions
            
            return f(*args, **kwargs)
        return decorated
    return wrapper     
        
        
        

# #______________2. ADMIN ROLE REQUIREMENT DECORATOR_____________________
# def admin_required(f):
    
#     @wraps(f)
#     def wrapper (*args, **kwargs):
#         if request.logged_in_user_role != 'admin':
#             return jsonify({'message': 'Admin access required!'}), 403 #403 Forbidden status code for insufficient permissions
        
#         return f(*args, **kwargs)
    
#     return wrapper

# #______________3. AUTHOR ROLE REQUIREMENT DECORATOR_____________________
# def author_required(f):
    
#     @wraps(f)
#     def wrapper (*args, **kwargs):
#         if request.logged_in_user_role != 'author':
#             return jsonify({'message': 'Author access required!'}), 403 #403 Forbidden status code for insufficient permissions
        
#         return f(*args, **kwargs)
    
#     return wrapper

# #______________4. READER ROLE REQUIREMENT DECORATOR_____________________
# def reader_required(f):
#     @wraps(f)
#     def wrapper (*args, **kwargs):
#         if request.logged_in_user_role != 'reader':
#             return jsonify({'message': 'Reader access required!'}), 403 #403 Forbidden status code for insufficient permissions
        
#         return f(*args, **kwargs)
    
#     return wrapper
    
    
