import React, { useState } from 'react';
import { Download, Eye, Trash2 } from 'lucide-react';
import { apiService } from '../services/api';
import { downloadFile, formatDate } from '../utils/helpers';
import toast from 'react-hot-toast';

const PhotoGrid = ({ photos, onPhotoDelete, showActions = true }) => {
  const [selectedPhotos, setSelectedPhotos] = useState(new Set());
  const [lightboxPhoto, setLightboxPhoto] = useState(null);

  const togglePhotoSelection = (photoId) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleDownloadPhoto = async (photo) => {
    try {
      const response = await apiService.downloadPhoto(photo.id);
      downloadFile(response.data, photo.original_filename);
      toast.success('Photo downloaded successfully');
    } catch (error) {
      toast.error('Failed to download photo');
    }
  };

  const handleDeletePhoto = async (photo) => {
    if (window.confirm('Are you sure you want to delete this photo?')) {
      try {
        await apiService.deletePhoto(photo.id);
        toast.success('Photo deleted successfully');
        if (onPhotoDelete) {
          onPhotoDelete(photo.id);
        }
      } catch (error) {
        toast.error('Failed to delete photo');
      }
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedPhotos.size === 0) {
      toast.error('Please select photos to download');
      return;
    }

    toast.promise(
      Promise.all(
        Array.from(selectedPhotos).map(async (photoId) => {
          const photo = photos.find(p => p.id === photoId);
          if (photo) {
            const response = await apiService.downloadPhoto(photo.id);
            downloadFile(response.data, photo.original_filename);
          }
        })
      ),
      {
        loading: 'Downloading photos...',
        success: `Downloaded ${selectedPhotos.size} photos`,
        error: 'Failed to download some photos'
      }
    );

    setSelectedPhotos(new Set());
  };

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No photos found</h3>
        <p className="text-gray-500">Upload some photos to get started.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Selection actions */}
      {showActions && selectedPhotos.size > 0 && (
        <div className="mb-6 p-4 bg-primary-50 rounded-lg border border-primary-200">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-primary-800">
              {selectedPhotos.size} photo{selectedPhotos.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex space-x-2">
              <button
                onClick={handleDownloadSelected}
                className="btn-primary text-sm"
              >
                <Download className="h-4 w-4 mr-1" />
                Download Selected
              </button>
              <button
                onClick={() => setSelectedPhotos(new Set())}
                className="btn-secondary text-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className={`card relative group cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedPhotos.has(photo.id) ? 'ring-2 ring-primary-500' : ''
            }`}
          >
            {/* Selection checkbox */}
            {showActions && (
              <div className="absolute top-2 left-2 z-10">
                <input
                  type="checkbox"
                  checked={selectedPhotos.has(photo.id)}
                  onChange={() => togglePhotoSelection(photo.id)}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
              </div>
            )}

            {/* Photo */}
            <div className="aspect-square overflow-hidden">
              <img
                src={apiService.getPhotoImage(photo.id, true)}
                alt={photo.original_filename}
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onClick={() => setLightboxPhoto(photo)}
              />
            </div>

            {/* Photo info */}
            <div className="p-3">
              <p className="text-xs text-gray-600 truncate" title={photo.original_filename}>
                {photo.original_filename}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {formatDate(photo.upload_date)}
              </p>
              {photo.faces_count > 0 && (
                <p className="text-xs text-primary-600 mt-1">
                  {photo.faces_count} face{photo.faces_count !== 1 ? 's' : ''}
                </p>
              )}
            </div>

            {/* Action buttons */}
            {showActions && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <div className="flex space-x-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxPhoto(photo);
                    }}
                    className="p-1 bg-black/50 text-white rounded hover:bg-black/70 transition-colors"
                    title="View"
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPhoto(photo);
                    }}
                    className="p-1 bg-black/50 text-white rounded hover:bg-black/70 transition-colors"
                    title="Download"
                  >
                    <Download className="h-3 w-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePhoto(photo);
                    }}
                    className="p-1 bg-red-500/80 text-white rounded hover:bg-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightboxPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={apiService.getPhotoImage(lightboxPhoto.id)}
              alt={lightboxPhoto.original_filename}
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setLightboxPhoto(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
            >
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="absolute bottom-4 left-4 text-white">
              <p className="font-medium">{lightboxPhoto.original_filename}</p>
              <p className="text-sm text-gray-300">{formatDate(lightboxPhoto.upload_date)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGrid;