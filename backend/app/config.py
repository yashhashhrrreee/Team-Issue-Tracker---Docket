import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-insecure-key")
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "sqlite:///" + os.path.join(os.getcwd(), "instance", "docket.db")
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    FRONTEND_ORIGIN = os.environ.get("FRONTEND_ORIGIN", "http://localhost:5173")
    FLASK_ENV = os.environ.get("FLASK_ENV", "development")

    # Security.md §2: session cookie flags are environment-conditional,
    # never hardcoded for both dev and prod.
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "None" if FLASK_ENV == "production" else "Lax"
    SESSION_COOKIE_SECURE = FLASK_ENV == "production"
