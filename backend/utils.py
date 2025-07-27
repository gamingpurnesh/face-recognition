import os
import uuid
from PIL import Image
from werkzeug.utils import secure_filename
from config import Config

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def generate_unique_filename(original_filename):
    """Generate a unique filename while preserving extension"""
    filename = secure_filename(original_filename)
    name, ext = os.path.splitext(filename)
    unique_name = f"{name}_{uuid.uuid4().hex[:8]}{ext}"
    return unique_name

def get_image_dimensions(image_path):
    """Get image width and height"""
    try:
        with Image.open(image_path) as img:
            return img.size  # Returns (width, height)
    except:
        return None, None

def create_thumbnail(image_path, thumbnail_path, size=(300, 300)):
    """Create a thumbnail of the image"""
    try:
        with Image.open(image_path) as img:
            img.thumbnail(size, Image.Resampling.LANCZOS)
            img.save(thumbnail_path, optimize=True, quality=85)
        return True
    except Exception as e:
        print(f"Error creating thumbnail: {str(e)}")
        return False

def validate_image(file_path):
    """Validate that the file is a valid image"""
    try:
        with Image.open(file_path) as img:
            img.verify()
        return True
    except:
        return False

def get_file_size(file_path):
    """Get file size in bytes"""
    try:
        return os.path.getsize(file_path)
    except:
        return 0

def ensure_directory_exists(directory):
    """Create directory if it doesn't exist"""
    if not os.path.exists(directory):
        os.makedirs(directory, exist_ok=True)

def sanitize_filename(filename):
    """Sanitize filename for security"""
    # Remove any path components
    filename = os.path.basename(filename)
    # Use werkzeug's secure_filename
    filename = secure_filename(filename)
    # Additional sanitization
    filename = filename.replace('..', '')
    return filename

def format_file_size(size_bytes):
    """Format file size in human readable format"""
    if size_bytes == 0:
        return "0B"
    size_names = ["B", "KB", "MB", "GB"]
    i = 0
    while size_bytes >= 1024 and i < len(size_names) - 1:
        size_bytes /= 1024.0
        i += 1
    return f"{size_bytes:.1f}{size_names[i]}"