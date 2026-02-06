from flask import Blueprint

tags_bp = Blueprint('tags_bp', __name__)

from . import routes