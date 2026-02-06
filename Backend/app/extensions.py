from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
ma = Marshmallow()
cors = CORS()
limiter = Limiter(
    get_remote_address,
    default_limits=["10000 per day"]
)