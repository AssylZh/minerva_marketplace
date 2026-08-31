"""Flask application factory for Minerva Marketplace.

Creates and configures the Flask app with all extensions (SQLAlchemy,
Flask-Migrate, JWT, CORS) and registers the route blueprints.
"""

import logging
import os
from datetime import timedelta

from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager

from backend import db, migrate
from backend.routes.auth import auth_bp
from backend.routes.items import items_bp
from backend.routes.messages import messages_bp
from backend.routes.dashboard import dashboard_bp

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger(__name__)


def _infer_schema_revision(inspector):
    """Infer the most likely Alembic revision for an existing SQLite schema."""
    table_names = set(inspector.get_table_names())

    def columns_for(table_name):
        if table_name not in table_names:
            return set()
        return {column["name"] for column in inspector.get_columns(table_name)}

    item_columns = columns_for("items")
    message_columns = columns_for("messages")

    has_item_purchase_fields = {"purchased_from", "purchased_year"}.issubset(item_columns)
    has_message_image = "image_url" in message_columns
    has_message_deleted = "deleted_at" in message_columns

    if has_item_purchase_fields and has_message_image and has_message_deleted:
        return "d7a1b2c3e4f5"
    if has_item_purchase_fields and has_message_image:
        return "c8e4f1a2b3d4"
    if has_item_purchase_fields:
        return "b3f2e1d4c5a6"
    return "a114181ffc69"


def create_app(testing=False):
    """Create and configure the Flask application.

    Args:
        testing: When True, uses an in-memory SQLite database and a
                 fixed test secret. Skips the JWT_SECRET_KEY env var check.

    Returns:
        A configured Flask application instance.
    """
    app = Flask(__name__)
    base_dir = os.path.dirname(os.path.abspath(__file__))
    message_upload_dir = os.path.join(base_dir, "static", "uploads", "messages")

    app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
        "DATABASE_URL", "sqlite:///app.db"
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    if testing:
        app.config["JWT_SECRET_KEY"] = "test-secret"
    else:
        jwt_secret = os.environ.get("JWT_SECRET_KEY")
        if not jwt_secret:
            logger.warning("JWT_SECRET_KEY not set — using insecure dev default. Do NOT use in production.")
            jwt_secret = "dev-secret-change-in-production"
        app.config["JWT_SECRET_KEY"] = jwt_secret

    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(days=7)
    app.config["TESTING"] = testing

    allowed_origins = os.environ.get("CORS_ORIGINS", "*")
    cors_origins = allowed_origins.split(",") if allowed_origins != "*" else "*"

    app.config["MESSAGE_UPLOAD_FOLDER"] = message_upload_dir

    db.init_app(app)
    migrate.init_app(app, db)
    JWTManager(app)
    CORS(app, origins=cors_origins)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(items_bp)
    app.register_blueprint(messages_bp)
    app.register_blueprint(dashboard_bp)

    @app.route("/api/health")
    def health():
        """Return a simple health-check response."""
        return jsonify({"status": "ok"})

    @app.route("/uploads/messages/<path:filename>")
    def serve_message_upload(filename):
        """Serve locally-stored message images (dev only; prod uses Cloudinary)."""
        return send_from_directory(app.config["MESSAGE_UPLOAD_FOLDER"], filename)

    logger.info("App created. Database: %s", app.config["SQLALCHEMY_DATABASE_URI"])
    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    with app.app_context():
        from flask_migrate import stamp, upgrade
        from sqlalchemy import inspect as sa_inspect

        inspector = sa_inspect(db.engine)
        table_names = set(inspector.get_table_names())
        if table_names:
            has_version_table = "alembic_version" in table_names
            has_version_row = False
            if has_version_table:
                from sqlalchemy import text

                with db.engine.connect() as connection:
                    has_version_row = bool(connection.execute(text("SELECT version_num FROM alembic_version LIMIT 1")).first())
            if not has_version_table or not has_version_row:
                stamp(revision=_infer_schema_revision(inspector))
        upgrade()
    app.run(port=port, debug=True)
