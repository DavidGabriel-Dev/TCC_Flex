from flask import Flask
from .config import Config
from .extensions import db, login_manager
from werkzeug.middleware.proxy_fix import ProxyFix

def create_app():
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_object(Config)

    app.wsgi_app = ProxyFix(
        app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1
    )

    db.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = 'sensors.login'

    from app.models.sensor_data import SensorData
    from app.models.sala import Sala
    from app.models.user import User

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    from app.routes.routes import bp as sensors_bp
    app.register_blueprint(sensors_bp)

    with app.app_context():
        db.create_all()

    return app