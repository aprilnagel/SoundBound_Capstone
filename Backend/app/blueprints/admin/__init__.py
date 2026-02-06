from flask import Blueprint

admin_bp = Blueprint('admin_bp', __name__)

from . import routes

#we need to import routes to register the routes with the blueprint