from flask import Blueprint

def init_routes(app):
    api = Blueprint("api", __name__)

    @api.route("/ping")
    def ping():
        return {"msg": "pong"}

    app.register_blueprint(api)
