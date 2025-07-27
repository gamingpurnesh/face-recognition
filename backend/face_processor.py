import face_recognition
import cv2
import numpy as np
from PIL import Image
import os
from sklearn.cluster import DBSCAN
from models import db, Photo, Person, Face
import json

class FaceProcessor:
    def __init__(self, tolerance=0.6, model='hog'):
        self.tolerance = tolerance
        self.model = model
    
    def process_photo(self, photo_path, photo_id):
        """
        Process a single photo to detect and extract faces
        Returns list of face data
        """
        try:
            # Load image
            image = face_recognition.load_image_file(photo_path)
            
            # Find face locations and encodings
            face_locations = face_recognition.face_locations(image, model=self.model)
            face_encodings = face_recognition.face_encodings(image, face_locations)
            
            faces_data = []
            
            for (top, right, bottom, left), encoding in zip(face_locations, face_encodings):
                # Create face record
                face = Face(
                    photo_id=photo_id,
                    top=top,
                    right=right,
                    bottom=bottom,
                    left=left
                )
                face.set_encoding(encoding)
                
                db.session.add(face)
                faces_data.append({
                    'face': face,
                    'encoding': encoding,
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
        Group all unassigned faces using clustering
        """
        try:
            # Get all faces without person assignment
            unassigned_faces = Face.query.filter_by(person_id=None).all()
            
            if len(unassigned_faces) < 2:
                # If less than 2 faces, create individual persons
                for face in unassigned_faces:
                    person = Person(name=f"Person {face.id}")
                    db.session.add(person)
                    db.session.flush()
                    face.person_id = person.id
                db.session.commit()
                return
            
            # Extract encodings
            encodings = []
            face_ids = []
            
            for face in unassigned_faces:
                try:
                    encoding = face.get_encoding()
                    encodings.append(encoding)
                    face_ids.append(face.id)
                except:
                    continue
            
            if len(encodings) < 2:
                return
            
            # Use DBSCAN clustering
            clustering = DBSCAN(eps=self.tolerance, min_samples=1, metric='euclidean')
            cluster_labels = clustering.fit_predict(encodings)
            
            # Create persons for each cluster
            cluster_to_person = {}
            
            for face_idx, cluster_label in enumerate(cluster_labels):
                face_id = face_ids[face_idx]
                face = Face.query.get(face_id)
                
                if cluster_label not in cluster_to_person:
                    # Create new person for this cluster
                    person = Person(name=f"Person {len(cluster_to_person) + 1}")
                    db.session.add(person)
                    db.session.flush()
                    cluster_to_person[cluster_label] = person.id
                
                face.person_id = cluster_to_person[cluster_label]
            
            db.session.commit()
            
        except Exception as e:
            print(f"Error grouping faces: {str(e)}")
            db.session.rollback()
    
    def match_face_to_existing_persons(self, face_encoding):
        """
        Try to match a face encoding to existing persons
        Returns person_id if match found, None otherwise
        """
        try:
            # Get all existing persons with their representative faces
            persons = Person.query.filter_by(is_merged=False).all()
            
            for person in persons:
                if not person.faces:
                    continue
                
                # Compare with all faces of this person
                for existing_face in person.faces:
                    try:
                        existing_encoding = existing_face.get_encoding()
                        distance = face_recognition.face_distance([existing_encoding], face_encoding)[0]
                        
                        if distance <= self.tolerance:
                            return person.id
                    except:
                        continue
            
            return None
            
        except Exception as e:
            print(f"Error matching face: {str(e)}")
            return None
    
    def process_and_group_photo(self, photo_path, photo_id):
        """
        Process a photo and immediately try to group faces with existing persons
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
                person = Person(name=f"Person {Person.query.count() + 1}")
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