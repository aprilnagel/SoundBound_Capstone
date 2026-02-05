from flask import Flask
from .extensions import db, ma, cors

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
        db.create_all()

    @app.get("/")
    def home():
        return {"message": "SoundBound API running"}

    return app