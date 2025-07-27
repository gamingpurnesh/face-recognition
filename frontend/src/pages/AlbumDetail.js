import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Download, Edit2, User } from 'lucide-react';
import { apiService } from '../services/api';
import { downloadFile, generateAvatarColor } from '../utils/helpers';
import PhotoGrid from '../components/PhotoGrid';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const AlbumDetail = () => {
  const { personId } = useParams();
  const [album, setAlbum] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    fetchAlbumData();
  }, [personId]);

  const fetchAlbumData = async () => {
    try {
      const response = await apiService.getAlbumPhotos(personId);
      setAlbum(response.data.person);
      setPhotos(response.data.photos);
      setNewName(response.data.person.name);
    } catch (error) {
      console.error('Failed to fetch album data:', error);
      toast.error('Failed to load album');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAlbum = async () => {
    if (!album) return;

    setDownloading(true);
    try {
      const response = await apiService.downloadAlbum(album.id);
      const filename = `${album.name.replace(/[^a-z0-9]/gi, '_')}_photos.zip`;
      downloadFile(response.data, filename);
      toast.success(`Downloaded ${album.name}'s photos`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download album');
    } finally {
      setDownloading(false);
    }
  };

  const handleRename = async () => {
    if (!newName.trim() || newName.trim() === album.name) {
      setEditing(false);
      setNewName(album.name);
      return;
    }

    try {
      await apiService.renamePerson(album.id, newName.trim());
      setAlbum(prev => ({ ...prev, name: newName.trim() }));
      setEditing(false);
      toast.success('Album renamed successfully');
    } catch (error) {
      console.error('Failed to rename album:', error);
      toast.error('Failed to rename album');
      setNewName(album.name);
      setEditing(false);
    }
  };

  const handlePhotoDelete = (photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  if (loading) {
    return <LoadingSpinner text="Loading album..." />;
  }

  if (!album) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <User className="h-16 w-16 mx-auto" />
        </div>
        <h3 className="text-xl font-medium text-gray-900 mb-2">Album not found</h3>
        <p className="text-gray-600 mb-6">
          The album you're looking for doesn't exist or has been removed.
        </p>
        <Link to="/albums" className="btn-primary">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Albums
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link
          to="/albums"
          className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Albums
        </Link>

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Album Avatar */}
            <div className="flex-shrink-0">
              {album.representative_face ? (
                <img
                  src={apiService.getPhotoImage(album.representative_face.photo_id, true)}
                  alt={album.name}
                  className="h-16 w-16 rounded-full object-cover"
                />
              ) : (
                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${generateAvatarColor(album.name)}`}>
                  <User className="h-8 w-8 text-white" />
                </div>
              )}
            </div>

            {/* Album Info */}
            <div>
              {editing ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onBlur={handleRename}
                    onKeyPress={(e) => e.key === 'Enter' && handleRename()}
                    className="text-2xl font-bold bg-transparent border-b-2 border-primary-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-gray-900">{album.name}</h1>
                  <button
                    onClick={() => setEditing(true)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    title="Rename album"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              )}
              <p className="text-gray-600">
                {photos.length} photo{photos.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex space-x-2">
            <button
              onClick={handleDownloadAlbum}
              disabled={downloading || photos.length === 0}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {downloading ? (
                <div className="loading-spinner h-4 w-4 mr-2"></div>
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Download All
            </button>
          </div>
        </div>
      </div>

      {/* Photos Grid */}
      {photos.length > 0 ? (
        <PhotoGrid 
          photos={photos} 
          onPhotoDelete={handlePhotoDelete}
          showActions={true}
        />
      ) : (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No photos in this album</h3>
          <p className="text-gray-500 mb-6">
            This person doesn't appear in any uploaded photos yet.
          </p>
          <Link to="/upload" className="btn-primary">
            Upload More Photos
          </Link>
        </div>
      )}

      {/* Album Info */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          About This Album
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Album Details:</h4>
            <ul className="space-y-1">
              <li>• Created: {new Date(album.created_date).toLocaleDateString()}</li>
              <li>• Total photos: {photos.length}</li>
              <li>• Faces detected: {album.representative_face ? 'Yes' : 'No'}</li>
              <li>• Album ID: {album.id}</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Sharing Options:</h4>
            <ul className="space-y-1">
              <li>• Share this URL with the person</li>
              <li>• No login required for viewing</li>
              <li>• Photos can be downloaded individually</li>
              <li>• Entire album can be downloaded as ZIP</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlbumDetail;