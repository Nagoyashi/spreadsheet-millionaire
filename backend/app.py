import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask_session import Session

from config import Config
from db_init import init_db


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    # Flask-Session — filesystem backend
    os.makedirs(Config.SESSION_FILE_DIR, exist_ok=True)
    Session(app)

    # ------------------------------------------------------------------ #
    # CORS — must allow credentials so the session cookie is sent
    # ------------------------------------------------------------------ #
    CORS(
        app,
        origins=Config.CORS_ORIGINS,
        supports_credentials=Config.CORS_SUPPORTS_CREDENTIALS,
    )

    # ------------------------------------------------------------------ #
    # Blueprints
    # ------------------------------------------------------------------ #
    from routes.auth        import bp as auth_bp
    from routes.calculators import bp as calculators_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(calculators_bp)

    # ------------------------------------------------------------------ #
    # Global error handlers
    # ------------------------------------------------------------------ #
    @app.errorhandler(404)
    def not_found(_):
        return jsonify({"error": "Resource not found."}), 404

    @app.errorhandler(405)
    def method_not_allowed(_):
        return jsonify({"error": "Method not allowed."}), 405

    @app.errorhandler(500)
    def internal_error(_):
        return jsonify({"error": "Internal server error."}), 500

    return app


# ------------------------------------------------------------------ #
# Bootstrap
# ------------------------------------------------------------------ #
if __name__ == "__main__":
    init_db()                           # creates tables if they don't exist
    app = create_app()
    app.run(host="0.0.0.0", port=5000, debug=Config.__dict__.get("FLASK_DEBUG", False))
