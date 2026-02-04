from flask import Flask
from .extensions import db, migrate, ma, cors

def create_app():
    app = Flask(__name__)

    # Load configuration (DevelopmentConfig inside config.py)
    app.config.from_object("config.DevelopmentConfig")

    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    ma.init_app(app)
    cors.init_app(app)

    # Import models AFTER db is initialized
    from . import models

    # Simple test route
    @app.get("/")
    def home():
        return {"message": "SoundBound API running"}

    return app