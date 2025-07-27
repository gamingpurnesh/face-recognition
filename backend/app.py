from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
import os
import threading
from datetime import datetime
import zipfile
import tempfile
import shutil

from config import Config
from models import db, Photo, Person, Face
from face_processor_mock import FaceProcessor
from utils import (
    allowed_file, generate_unique_filename, get_image_dimensions,
    create_thumbnail, validate_image, get_file_size, ensure_directory_exists,
    sanitize_filename, format_file_size
)

app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
CORS(app, origins=["http://localhost:3000", "https://work-1-nbzjicskggkwmgic.prod-runtime.all-hands.dev"])
db.init_app(app)

# Initialize face processor
face_processor = FaceProcessor(
    tolerance=app.config['FACE_RECOGNITION_TOLERANCE'],
    model=app.config['FACE_RECOGNITION_MODEL']
)

# Ensure upload directories exist
ensure_directory_exists(app.config['UPLOAD_FOLDER'])
ensure_directory_exists(os.path.join(app.config['UPLOAD_FOLDER'], 'thumbnails'))

def create_tables():
    """Create database tables"""
    with app.app_context():
        db.create_all()

# API Routes

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})

@app.route('/api/upload', methods=['POST'])
def upload_photos():
    """Upload multiple photos"""
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400
        
        files = request.files.getlist('files')
        if not files or all(file.filename == '' for file in files):
            return jsonify({'error': 'No files selected'}), 400
        
        uploaded_files = []
        processing_queue = []
        
        for file in files:
            if file and file.filename and allowed_file(file.filename):
                try:
                    # Generate unique filename
                    original_filename = sanitize_filename(file.filename)
                    unique_filename = generate_unique_filename(original_filename)
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    
                    # Save file
                    file.save(file_path)
                    
                    # Validate image
                    if not validate_image(file_path):
                        os.remove(file_path)
                        continue
                    
                    # Get image info
                    width, height = get_image_dimensions(file_path)
                    file_size = get_file_size(file_path)
                    
                    # Create thumbnail
                    thumbnail_path = os.path.join(app.config['UPLOAD_FOLDER'], 'thumbnails', unique_filename)
                    create_thumbnail(file_path, thumbnail_path)
                    
                    # Save to database
                    photo = Photo(
                        filename=unique_filename,
                        original_filename=original_filename,
                        file_path=file_path,
                        file_size=file_size,
                        width=width,
                        height=height
                    )
                    
                    db.session.add(photo)
                    db.session.flush()  # Get the ID
                    
                    uploaded_files.append(photo.to_dict())
                    processing_queue.append((file_path, photo.id))
                    
                except Exception as e:
                    print(f"Error uploading file {file.filename}: {str(e)}")
                    continue
        
        db.session.commit()
        
        # Process faces in background
        if processing_queue:
            thread = threading.Thread(
                target=process_photos_background,
                args=(processing_queue,)
            )
            thread.daemon = True
            thread.start()
        
        return jsonify({
            'message': f'Successfully uploaded {len(uploaded_files)} photos',
            'photos': uploaded_files,
            'processing': True
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

def process_photos_background(processing_queue):
    """Process photos in background thread"""
    with app.app_context():
        for file_path, photo_id in processing_queue:
            try:
                face_processor.process_and_group_photo(file_path, photo_id)
                print(f"Processed photo {photo_id}")
            except Exception as e:
                print(f"Error processing photo {photo_id}: {str(e)}")

@app.route('/api/photos', methods=['GET'])
def get_photos():
    """Get all photos with pagination"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        
        photos = Photo.query.paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'photos': [photo.to_dict() for photo in photos.items],
            'total': photos.total,
            'pages': photos.pages,
            'current_page': page,
            'has_next': photos.has_next,
            'has_prev': photos.has_prev
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/albums', methods=['GET'])
def get_albums():
    """Get all person albums"""
    try:
        persons = Person.query.filter_by(is_merged=False).all()
        albums = []
        
        for person in persons:
            if person.faces:  # Only include persons with faces
                albums.append(person.to_dict())
        
        # Sort by photo count (descending)
        albums.sort(key=lambda x: x['photo_count'], reverse=True)
        
        return jsonify({'albums': albums})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/albums/<int:person_id>', methods=['GET'])
def get_album_photos(person_id):
    """Get all photos for a specific person"""
    try:
        person = Person.query.get_or_404(person_id)
        
        if person.is_merged:
            return jsonify({'error': 'Person has been merged'}), 404
        
        # Get all photos containing this person
        photo_ids = [face.photo_id for face in person.faces]
        photos = Photo.query.filter(Photo.id.in_(photo_ids)).all()
        
        return jsonify({
            'person': person.to_dict(),
            'photos': [photo.to_dict() for photo in photos]
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/albums/<int:person_id>/download', methods=['GET'])
def download_album(person_id):
    """Download all photos of a person as ZIP"""
    try:
        person = Person.query.get_or_404(person_id)
        
        if person.is_merged:
            return jsonify({'error': 'Person has been merged'}), 404
        
        # Get all photos containing this person
        photo_ids = [face.photo_id for face in person.faces]
        photos = Photo.query.filter(Photo.id.in_(photo_ids)).all()
        
        if not photos:
            return jsonify({'error': 'No photos found'}), 404
        
        # Create temporary ZIP file
        temp_dir = tempfile.mkdtemp()
        zip_path = os.path.join(temp_dir, f"{person.name.replace(' ', '_')}_photos.zip")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for photo in photos:
                if os.path.exists(photo.file_path):
                    zipf.write(photo.file_path, photo.original_filename)
        
        return send_file(
            zip_path,
            as_attachment=True,
            download_name=f"{person.name.replace(' ', '_')}_photos.zip",
            mimetype='application/zip'
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/photos/<int:photo_id>/image', methods=['GET'])
def get_photo_image(photo_id):
    """Serve photo image"""
    try:
        photo = Photo.query.get_or_404(photo_id)
        
        # Check if thumbnail is requested
        thumbnail = request.args.get('thumbnail', 'false').lower() == 'true'
        
        if thumbnail:
            thumbnail_path = os.path.join(app.config['UPLOAD_FOLDER'], 'thumbnails', photo.filename)
            if os.path.exists(thumbnail_path):
                return send_file(thumbnail_path)
        
        # Serve original image
        if os.path.exists(photo.file_path):
            return send_file(photo.file_path)
        else:
            return jsonify({'error': 'Image not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/photos/<int:photo_id>/download', methods=['GET'])
def download_photo(photo_id):
    """Download a single photo"""
    try:
        photo = Photo.query.get_or_404(photo_id)
        
        if os.path.exists(photo.file_path):
            return send_file(
                photo.file_path,
                as_attachment=True,
                download_name=photo.original_filename
            )
        else:
            return jsonify({'error': 'Image not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Admin Routes

@app.route('/api/admin/persons/<int:person_id>/rename', methods=['PUT'])
def rename_person(person_id):
    """Rename a person"""
    try:
        data = request.get_json()
        new_name = data.get('name', '').strip()
        
        if not new_name:
            return jsonify({'error': 'Name is required'}), 400
        
        person = Person.query.get_or_404(person_id)
        person.name = new_name
        db.session.commit()
        
        return jsonify({'message': 'Person renamed successfully', 'person': person.to_dict()})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/persons/merge', methods=['POST'])
def merge_persons():
    """Merge two persons"""
    try:
        data = request.get_json()
        person_id_1 = data.get('person_id_1')
        person_id_2 = data.get('person_id_2')
        
        if not person_id_1 or not person_id_2:
            return jsonify({'error': 'Both person IDs are required'}), 400
        
        if person_id_1 == person_id_2:
            return jsonify({'error': 'Cannot merge person with themselves'}), 400
        
        success = face_processor.merge_persons(person_id_1, person_id_2)
        
        if success:
            return jsonify({'message': 'Persons merged successfully'})
        else:
            return jsonify({'error': 'Failed to merge persons'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/photos/<int:photo_id>', methods=['DELETE'])
def delete_photo(photo_id):
    """Delete a photo"""
    try:
        photo = Photo.query.get_or_404(photo_id)
        
        # Delete files
        if os.path.exists(photo.file_path):
            os.remove(photo.file_path)
        
        thumbnail_path = os.path.join(app.config['UPLOAD_FOLDER'], 'thumbnails', photo.filename)
        if os.path.exists(thumbnail_path):
            os.remove(thumbnail_path)
        
        # Delete from database (faces will be deleted due to cascade)
        db.session.delete(photo)
        db.session.commit()
        
        return jsonify({'message': 'Photo deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/stats', methods=['GET'])
def get_stats():
    """Get system statistics"""
    try:
        total_photos = Photo.query.count()
        processed_photos = Photo.query.filter_by(processed=True).count()
        total_persons = Person.query.filter_by(is_merged=False).count()
        total_faces = Face.query.count()
        
        # Calculate total storage used
        total_size = db.session.query(db.func.sum(Photo.file_size)).scalar() or 0
        
        return jsonify({
            'total_photos': total_photos,
            'processed_photos': processed_photos,
            'total_persons': total_persons,
            'total_faces': total_faces,
            'total_storage': format_file_size(total_size),
            'processing_progress': (processed_photos / total_photos * 100) if total_photos > 0 else 0
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/reprocess', methods=['POST'])
def reprocess_faces():
    """Reprocess all faces and regroup"""
    try:
        # Clear existing face assignments
        Face.query.update({'person_id': None})
        Person.query.update({'is_merged': False, 'merged_into_id': None})
        db.session.commit()
        
        # Regroup faces
        face_processor.group_faces()
        
        return jsonify({'message': 'Face reprocessing started'})
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# Error handlers
@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    app.run(
        host='0.0.0.0',
        port=8000,
        debug=True,
        use_reloader=False
    )