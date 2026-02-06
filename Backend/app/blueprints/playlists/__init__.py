from flask import Blueprint

playlists_bp = Blueprint('playlists_bp', __name__)

from . import routes