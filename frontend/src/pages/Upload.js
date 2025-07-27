import React, { useState, useEffect } from 'react';
import { Camera, Clock, CheckCircle } from 'lucide-react';
import FileUpload from '../components/FileUpload';
import PhotoGrid from '../components/PhotoGrid';
import LoadingSpinner from '../components/LoadingSpinner';
import { apiService } from '../services/api';
import toast from 'react-hot-toast';

const Upload = () => {
  const [recentPhotos, setRecentPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchRecentPhotos();
    fetchStats();
  }, []);

  const fetchRecentPhotos = async () => {
    try {
      const response = await apiService.getPhotos(1, 12);
      setRecentPhotos(response.data.photos);
    } catch (error) {
      console.error('Failed to fetch recent photos:', error);
      toast.error('Failed to load recent photos');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const handleUploadComplete = (newPhotos) => {
    // Add new photos to the recent photos list
    setRecentPhotos(prev => [...newPhotos, ...prev].slice(0, 12));
    // Refresh stats
    fetchStats();
    toast.success('Photos uploaded successfully! Face recognition is processing in the background.');
  };

  const handlePhotoDelete = (photoId) => {
    setRecentPhotos(prev => prev.filter(photo => photo.id !== photoId));
    fetchStats();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <Camera className="h-16 w-16 text-primary-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Wedding Photos
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Upload your wedding photos and let our AI automatically organize them by faces. 
          Each person will get their own personalized album.
        </p>
      </div>

      {/* Processing Status */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Camera className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Total Photos</p>
                <p className="text-2xl font-bold text-primary-600">{stats.total_photos}</p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                {stats.processing_progress === 100 ? (
                  <CheckCircle className="h-8 w-8 text-green-600" />
                ) : (
                  <Clock className="h-8 w-8 text-yellow-600" />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Processing</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {Math.round(stats.processing_progress)}%
                </p>
              </div>
            </div>
          </div>

          <div className="card p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-600">
                    {stats.total_persons}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">People Found</p>
                <p className="text-2xl font-bold text-primary-600">{stats.total_persons}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Component */}
      <div className="card p-6">
        <FileUpload onUploadComplete={handleUploadComplete} />
      </div>

      {/* Recent Photos */}
      {recentPhotos.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recent Uploads</h2>
            <span className="text-sm text-gray-500">
              Showing {recentPhotos.length} most recent photos
            </span>
          </div>
          
          {loading ? (
            <LoadingSpinner text="Loading recent photos..." />
          ) : (
            <PhotoGrid 
              photos={recentPhotos} 
              onPhotoDelete={handlePhotoDelete}
              showActions={true}
            />
          )}
        </div>
      )}

      {/* Processing Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-blue-800 mb-3">
          About Face Recognition Processing
        </h3>
        <div className="space-y-2 text-sm text-blue-700">
          <p>• Photos are processed automatically in the background after upload</p>
          <p>• Face detection and grouping typically takes 1-3 minutes per 100 photos</p>
          <p>• You can view albums as soon as processing is complete</p>
          <p>• Similar faces are automatically grouped together into person albums</p>
          <p>• Processing progress is shown in real-time on this page</p>
        </div>
      </div>

      {/* Upload Guidelines */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-green-800 mb-3">
          Photo Upload Guidelines
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-green-700">
          <div>
            <h4 className="font-medium mb-2">Best Results:</h4>
            <ul className="space-y-1">
              <li>• Clear, well-lit photos</li>
              <li>• Front-facing portraits work best</li>
              <li>• High resolution images (recommended)</li>
              <li>• Multiple angles of the same person</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Technical Requirements:</h4>
            <ul className="space-y-1">
              <li>• Supported formats: JPG, PNG</li>
              <li>• Maximum file size: 16MB per photo</li>
              <li>• No limit on number of photos</li>
              <li>• Batch upload supported</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Upload;