from flask import Blueprint

songs_bp = Blueprint('songs_bp', __name__)

from . import routes, schemas

