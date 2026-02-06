from flask import Flask
from .extensions import db, ma, cors
from .blueprints.auth import auth_bp
from .blueprints.admin import admin_bp
from .blueprints.books import books_bp
from .blueprints.playlists import playlists_bp
from .blueprints.songs import songs_bp
from .blueprints.tags import tags_bp
from .blueprints.users import users_bp

def create_app():
    app = Flask(__name__)

    # Load config
    app.config.from_object("config.DevelopmentConfig")

    # Initialize extensions
    db.init_app(app)
    ma.init_app(app)
    cors.init_app(app)

    # Import models so SQLAlchemy knows them
    from . import models

    # Create tables automatically
    with app.app_context():
        db.drop_all()
        db.create_all()

    @app.get("/")
    def home():
        return {"message": "SoundBound API running"}
    
    #register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(admin_bp, url_prefix='/admin')
    app.register_blueprint(books_bp, url_prefix='/books')
    app.register_blueprint(playlists_bp, url_prefix='/playlists')
    app.register_blueprint(songs_bp, url_prefix='/songs')
    app.register_blueprint(tags_bp, url_prefix='/tags')
    app.register_blueprint(users_bp, url_prefix='/users')

    return app