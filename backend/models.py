from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class Photo(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    filename = db.Column(db.String(255), nullable=False)
    original_filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    upload_date = db.Column(db.DateTime, default=datetime.utcnow)
    file_size = db.Column(db.Integer)
    width = db.Column(db.Integer)
    height = db.Column(db.Integer)
    processed = db.Column(db.Boolean, default=False)
    
    # Relationships
    faces = db.relationship('Face', backref='photo', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'filename': self.filename,
            'original_filename': self.original_filename,
            'file_path': self.file_path,
            'upload_date': self.upload_date.isoformat(),
            'file_size': self.file_size,
            'width': self.width,
            'height': self.height,
            'processed': self.processed,
            'faces_count': len(self.faces)
        }

class Person(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), default='Unknown Person')
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_merged = db.Column(db.Boolean, default=False)
    merged_into_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=True)
    
    # Relationships
    faces = db.relationship('Face', backref='person', lazy=True)
    merged_into = db.relationship('Person', remote_side=[id], backref='merged_persons')
    
    @property
    def photo_count(self):
        return len(set(face.photo_id for face in self.faces if not self.is_merged))
    
    @property
    def representative_face(self):
        """Get the best face to represent this person"""
        if not self.faces:
            return None
        # Return the face with highest confidence or first one
        return max(self.faces, key=lambda f: f.confidence or 0)
    
    def to_dict(self):
        rep_face = self.representative_face
        return {
            'id': self.id,
            'name': self.name,
            'created_date': self.created_date.isoformat(),
            'photo_count': self.photo_count,
            'representative_face': rep_face.to_dict() if rep_face else None,
            'is_merged': self.is_merged
        }

class Face(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    photo_id = db.Column(db.Integer, db.ForeignKey('photo.id'), nullable=False)
    person_id = db.Column(db.Integer, db.ForeignKey('person.id'), nullable=True)
    
    # Face coordinates (bounding box)
    top = db.Column(db.Integer, nullable=False)
    right = db.Column(db.Integer, nullable=False)
    bottom = db.Column(db.Integer, nullable=False)
    left = db.Column(db.Integer, nullable=False)
    
    # Face encoding (stored as JSON string)
    encoding = db.Column(db.Text, nullable=False)
    confidence = db.Column(db.Float, default=0.0)
    
    created_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    def get_encoding(self):
        """Convert JSON string back to numpy array"""
        import numpy as np
        return np.array(json.loads(self.encoding))
    
    def set_encoding(self, encoding_array):
        """Convert numpy array to JSON string"""
        import numpy as np
        self.encoding = json.dumps(encoding_array.tolist())
    
    def to_dict(self):
        return {
            'id': self.id,
            'photo_id': self.photo_id,
            'person_id': self.person_id,
            'bounding_box': {
                'top': self.top,
                'right': self.right,
                'bottom': self.bottom,
                'left': self.left
            },
            'confidence': self.confidence,
            'created_date': self.created_date.isoformat()
        }