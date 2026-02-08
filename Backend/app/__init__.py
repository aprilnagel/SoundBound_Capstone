
from dotenv import load_dotenv
load_dotenv()
from flask import Flask, app


from .extensions import db, ma, cors
from .blueprints.auth import auth_bp
from .blueprints.books import books_bp
from .blueprints.playlists import playlists_bp
from .blueprints.songs import songs_bp
from .blueprints.tags import tags_bp
from .blueprints.users import users_bp



def create_app():
    app = Flask(__name__)
    


    # Load config
    app.config.from_object("config.ProductionConfig")  # Change to DevelopmentConfig or ProductionConfig as needed
    import os
    

    app.config["SPOTIFY_CLIENT_ID"] = os.getenv("SPOTIFY_CLIENT_ID")
    app.config["SPOTIFY_CLIENT_SECRET"] = os.getenv("SPOTIFY_CLIENT_SECRET")

    # Initialize extensions
    db.init_app(app)
    ma.init_app(app)
    cors.init_app(app)

    # Import models so SQLAlchemy knows them
    from . import models

    # Create tables automatically
    with app.app_context():
        print("USING DB FILE:", os.path.abspath(db.engine.url.database))
        # db.drop_all()
        db.create_all()
        

    @app.get("/")
    def home():
        return {"message": "SoundBound API running"}
    
    #register blueprints
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(books_bp, url_prefix='/books')
    app.register_blueprint(playlists_bp, url_prefix='/playlists')
    app.register_blueprint(songs_bp, url_prefix='/songs')
    app.register_blueprint(tags_bp, url_prefix='/tags')
    app.register_blueprint(users_bp, url_prefix='/users')

    return app