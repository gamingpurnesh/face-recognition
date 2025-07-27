import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import { apiService } from '../services/api';
import { formatFileSize, isValidImageFile, isValidFileSize } from '../utils/helpers';
import toast from 'react-hot-toast';

const FileUpload = ({ onUploadComplete }) => {
  const [uploadQueue, setUploadQueue] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Handle rejected files
    rejectedFiles.forEach(({ file, errors }) => {
      errors.forEach(error => {
        if (error.code === 'file-too-large') {
          toast.error(`${file.name} is too large. Maximum size is 16MB.`);
        } else if (error.code === 'file-invalid-type') {
          toast.error(`${file.name} is not a valid image file.`);
        }
      });
    });

    // Validate and add accepted files to queue
    const validFiles = acceptedFiles.filter(file => {
      if (!isValidImageFile(file)) {
        toast.error(`${file.name} is not a valid image file.`);
        return false;
      }
      if (!isValidFileSize(file)) {
        toast.error(`${file.name} is too large. Maximum size is 16MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length > 0) {
      const newFiles = validFiles.map(file => ({
        id: Date.now() + Math.random(),
        file,
        status: 'pending', // pending, uploading, success, error
        progress: 0,
        error: null
      }));

      setUploadQueue(prev => [...prev, ...newFiles]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png']
    },
    maxSize: 16 * 1024 * 1024, // 16MB
    multiple: true
  });

  const removeFromQueue = (fileId) => {
    setUploadQueue(prev => prev.filter(item => item.id !== fileId));
  };

  const clearQueue = () => {
    setUploadQueue([]);
    setUploadProgress(0);
  };

  const uploadFiles = async () => {
    if (uploadQueue.length === 0) {
      toast.error('No files to upload');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const files = uploadQueue.map(item => item.file);
      
      const response = await apiService.uploadPhotos(files, (progressEvent) => {
        const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        setUploadProgress(progress);
      });

      toast.success(`Successfully uploaded ${response.data.photos.length} photos`);
      
      // Clear the queue
      clearQueue();
      
      // Notify parent component
      if (onUploadComplete) {
        onUploadComplete(response.data.photos);
      }

    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Drop zone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors duration-200 ${
          isDragActive
            ? 'border-primary-500 bg-primary-50'
            : 'border-gray-300 hover:border-primary-400 hover:bg-gray-50'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className={`mx-auto h-12 w-12 mb-4 ${isDragActive ? 'text-primary-500' : 'text-gray-400'}`} />
        
        {isDragActive ? (
          <div>
            <p className="text-lg font-medium text-primary-600 mb-2">Drop the files here</p>
            <p className="text-sm text-primary-500">Release to add them to the upload queue</p>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              Drag & drop wedding photos here
            </p>
            <p className="text-sm text-gray-600 mb-4">
              or click to select files from your computer
            </p>
            <button className="btn-primary">
              Choose Files
            </button>
            <p className="text-xs text-gray-500 mt-4">
              Supports JPG, PNG files up to 16MB each
            </p>
          </div>
        )}
      </div>

      {/* Upload queue */}
      {uploadQueue.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                Upload Queue ({uploadQueue.length} files)
              </h3>
              <div className="flex space-x-2">
                <button
                  onClick={uploadFiles}
                  disabled={isUploading}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload All'}
                </button>
                <button
                  onClick={clearQueue}
                  disabled={isUploading}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Clear Queue
                </button>
              </div>
            </div>
            
            {/* Upload progress */}
            {isUploading && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                  <span>Uploading files...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* File list */}
          <div className="max-h-64 overflow-y-auto">
            {uploadQueue.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {/* File preview */}
                  <div className="flex-shrink-0">
                    <img
                      src={URL.createObjectURL(item.file)}
                      alt={item.file.name}
                      className="h-10 w-10 object-cover rounded"
                    />
                  </div>
                  
                  {/* File info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatFileSize(item.file.size)}
                    </p>
                  </div>
                </div>

                {/* Status */}
                <div className="flex items-center space-x-2">
                  {item.status === 'pending' && (
                    <div className="text-gray-400">
                      <Upload className="h-4 w-4" />
                    </div>
                  )}
                  {item.status === 'success' && (
                    <div className="text-green-500">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                  )}
                  {item.status === 'error' && (
                    <div className="text-red-500">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                  )}
                  
                  {/* Remove button */}
                  <button
                    onClick={() => removeFromQueue(item.id)}
                    disabled={isUploading}
                    className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Upload tips */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="text-sm font-medium text-blue-800 mb-2">Tips for best results:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Upload clear, well-lit photos with visible faces</li>
          <li>• Front-facing photos work better than profile shots</li>
          <li>• Higher resolution images provide better face recognition</li>
          <li>• The system will automatically group similar faces together</li>
        </ul>
      </div>
    </div>
  );
};

export default FileUpload;