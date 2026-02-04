import os
from flask import Flask
from .extensions import engine, SessionLocal, Base
from . import models

def create_app():
    app = Flask(__name__)

    # Load your development config
    app.config.from_object("config.DevelopmentConfig")

    @app.get("/")
    def home():
        return {"message": "SoundBound API running"}

    return app

