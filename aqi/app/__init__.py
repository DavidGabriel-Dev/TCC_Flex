from flask import Flask
from .config import Config
from .extensions import db

def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    db.init_app(app)

    # Importa os models
    from app.models.sensor_data import SensorData
    from app.models.sala import Sala

    from app.routes.routes import bp as sensors_bp

    app.register_blueprint(sensors_bp)

    with app.app_context():
        db.create_all()

    return app