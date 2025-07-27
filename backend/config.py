import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URL') or 'sqlite:///wedding_photos.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or '../uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    
    # Face recognition settings
    FACE_RECOGNITION_TOLERANCE = 0.6
    FACE_RECOGNITION_MODEL = 'hog'  # 'hog' for CPU, 'cnn' for GPU
    
    # Admin settings
    ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD') or 'admin123'