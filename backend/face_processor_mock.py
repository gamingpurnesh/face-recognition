import cv2
import numpy as np
from PIL import Image
import os
import random
from models import db, Photo, Person, Face
import json

class FaceProcessor:
    """
    Mock face processor for development/demo purposes.
    This creates fake face detections for testing the application.
    Replace with real face_processor.py when face_recognition is available.
    """
    
    def __init__(self, tolerance=0.6, model='hog'):
        self.tolerance = tolerance
        self.model = model
    
    def process_photo(self, photo_path, photo_id):
        """
        Mock process a single photo to detect and extract faces
        Returns list of face data
        """
        try:
            # Load image to get dimensions
            image = cv2.imread(photo_path)
            if image is None:
                return []
            
            height, width = image.shape[:2]
            
            # Generate 1-3 random fake faces per image
            num_faces = random.randint(1, 3)
            faces_data = []
            
            for i in range(num_faces):
                # Generate random face location
                face_size = random.randint(50, min(width, height) // 3)
                top = random.randint(0, max(0, height - face_size))
                left = random.randint(0, max(0, width - face_size))
                bottom = min(top + face_size, height)
                right = min(left + face_size, width)
                
                # Generate fake encoding (128-dimensional vector)
                fake_encoding = np.random.rand(128).astype(np.float64)
                
                # Create face record
                face = Face(
                    photo_id=photo_id,
                    top=top,
                    right=right,
                    bottom=bottom,
                    left=left,
                    confidence=random.uniform(0.7, 0.95)
                )
                face.set_encoding(fake_encoding)
                
                db.session.add(face)
                faces_data.append({
                    'face': face,
                    'encoding': fake_encoding,
                    'location': (top, right, bottom, left)
                })
            
            # Mark photo as processed
            photo = Photo.query.get(photo_id)
            if photo:
                photo.processed = True
            
            db.session.commit()
            return faces_data
            
        except Exception as e:
            print(f"Error processing photo {photo_id}: {str(e)}")
            return []
    
    def group_faces(self):
        """
        Mock group all unassigned faces using fake clustering
        """
        try:
            # Get all faces without person assignment
            unassigned_faces = Face.query.filter_by(person_id=None).all()
            
            if len(unassigned_faces) < 1:
                return
            
            # Simple mock grouping: randomly assign faces to persons
            # In real implementation, this would use actual face similarity
            
            # Create some persons first
            num_persons = max(1, len(unassigned_faces) // 3)  # Roughly 3 faces per person
            persons = []
            
            for i in range(num_persons):
                person = Person(name=f"Person {i + 1}")
                db.session.add(person)
                persons.append(person)
            
            db.session.flush()  # Get person IDs
            
            # Randomly assign faces to persons
            for face in unassigned_faces:
                person = random.choice(persons)
                face.person_id = person.id
            
            db.session.commit()
            
        except Exception as e:
            print(f"Error grouping faces: {str(e)}")
            db.session.rollback()
    
    def match_face_to_existing_persons(self, face_encoding):
        """
        Mock try to match a face encoding to existing persons
        Returns person_id if match found, None otherwise
        """
        try:
            # Get all existing persons
            persons = Person.query.filter_by(is_merged=False).all()
            
            if not persons:
                return None
            
            # Mock matching: 30% chance to match with existing person
            if random.random() < 0.3 and persons:
                return random.choice(persons).id
            
            return None
            
        except Exception as e:
            print(f"Error matching face: {str(e)}")
            return None
    
    def process_and_group_photo(self, photo_path, photo_id):
        """
        Mock process a photo and immediately try to group faces with existing persons
        """
        faces_data = self.process_photo(photo_path, photo_id)
        
        for face_data in faces_data:
            face = face_data['face']
            encoding = face_data['encoding']
            
            # Try to match with existing persons
            person_id = self.match_face_to_existing_persons(encoding)
            
            if person_id:
                face.person_id = person_id
            else:
                # Create new person
                person_count = Person.query.count()
                person = Person(name=f"Person {person_count + 1}")
                db.session.add(person)
                db.session.flush()
                face.person_id = person.id
        
        db.session.commit()
        return len(faces_data)
    
    def merge_persons(self, person_id_1, person_id_2):
        """
        Merge two persons into one
        """
        try:
            person1 = Person.query.get(person_id_1)
            person2 = Person.query.get(person_id_2)
            
            if not person1 or not person2:
                return False
            
            # Move all faces from person2 to person1
            for face in person2.faces:
                face.person_id = person1.id
            
            # Mark person2 as merged
            person2.is_merged = True
            person2.merged_into_id = person1.id
            
            db.session.commit()
            return True
            
        except Exception as e:
            print(f"Error merging persons: {str(e)}")
            db.session.rollback()
            return False
    
    def extract_face_image(self, photo_path, face_location, output_path):
        """
        Extract and save a face image from a photo
        """
        try:
            image = cv2.imread(photo_path)
            top, right, bottom, left = face_location
            
            # Extract face region
            face_image = image[top:bottom, left:right]
            
            # Save face image
            cv2.imwrite(output_path, face_image)
            return True
            
        except Exception as e:
            print(f"Error extracting face: {str(e)}")
            return False