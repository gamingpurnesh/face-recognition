import React, { useState, useEffect } from 'react';
import { Settings, BarChart3, Users, Camera, RefreshCw, Merge } from 'lucide-react';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Admin = () => {
  const [stats, setStats] = useState(null);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [selectedAlbums, setSelectedAlbums] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsResponse, albumsResponse] = await Promise.all([
        apiService.getStats(),
        apiService.getAlbums()
      ]);
      
      setStats(statsResponse.data);
      setAlbums(albumsResponse.data.albums);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
      toast.error('Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleReprocess = async () => {
    if (!window.confirm('This will reprocess all faces and recreate albums. This may take several minutes. Continue?')) {
      return;
    }

    setReprocessing(true);
    try {
      await apiService.reprocessFaces();
      toast.success('Face reprocessing started. This may take a few minutes.');
      // Refresh data after a delay
      setTimeout(fetchData, 2000);
    } catch (error) {
      console.error('Failed to start reprocessing:', error);
      toast.error('Failed to start reprocessing');
    } finally {
      setReprocessing(false);
    }
  };

  const handleMergeAlbums = async () => {
    if (selectedAlbums.length !== 2) {
      toast.error('Please select exactly 2 albums to merge');
      return;
    }

    const [album1, album2] = selectedAlbums;
    const confirmMessage = `Merge "${album1.name}" with "${album2.name}"? This action cannot be undone.`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      await apiService.mergePersons(album1.id, album2.id);
      toast.success(`Successfully merged albums`);
      setSelectedAlbums([]);
      fetchData();
    } catch (error) {
      console.error('Failed to merge albums:', error);
      toast.error('Failed to merge albums');
    }
  };

  const toggleAlbumSelection = (album) => {
    setSelectedAlbums(prev => {
      const isSelected = prev.find(a => a.id === album.id);
      if (isSelected) {
        return prev.filter(a => a.id !== album.id);
      } else if (prev.length < 2) {
        return [...prev, album];
      } else {
        toast.error('You can only select 2 albums for merging');
        return prev;
      }
    });
  };

  if (loading) {
    return <LoadingSpinner text="Loading admin panel..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <Settings className="h-16 w-16 text-primary-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Admin Panel
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Manage your wedding photo album system, view statistics, and perform administrative tasks.
        </p>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Camera className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Photos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_photos}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">People Found</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_persons}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <BarChart3 className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Faces Detected</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total_faces}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-orange-600">
                    {Math.round(stats.processing_progress)}%
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Processing</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.processed_photos}/{stats.total_photos}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Processing Progress */}
      {stats && stats.processing_progress < 100 && (
        <div className="card p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Status</h3>
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Face Recognition Progress</span>
              <span>{Math.round(stats.processing_progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${stats.processing_progress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {stats.total_photos - stats.processed_photos} photos remaining
            </p>
          </div>
        </div>
      )}

      {/* Admin Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Actions</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-900">Reprocess All Faces</h4>
              <p className="text-sm text-gray-600">
                Clear all face groupings and reprocess all photos. Use this if face recognition results are poor.
              </p>
            </div>
            <button
              onClick={handleReprocess}
              disabled={reprocessing}
              className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reprocessing ? (
                <div className="loading-spinner h-4 w-4 mr-2"></div>
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {reprocessing ? 'Processing...' : 'Reprocess'}
            </button>
          </div>
        </div>
      </div>

      {/* Album Management */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Album Management</h3>
          {selectedAlbums.length === 2 && (
            <button
              onClick={handleMergeAlbums}
              className="btn-primary"
            >
              <Merge className="h-4 w-4 mr-2" />
              Merge Selected Albums
            </button>
          )}
        </div>

        {selectedAlbums.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              {selectedAlbums.length} album{selectedAlbums.length !== 1 ? 's' : ''} selected for merging.
              {selectedAlbums.length === 1 && ' Select one more album to merge.'}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
          {albums.map((album) => {
            const isSelected = selectedAlbums.find(a => a.id === album.id);
            return (
              <div
                key={album.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => toggleAlbumSelection(album)}
              >
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={!!isSelected}
                    onChange={() => {}}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {album.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {albums.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No albums available for management</p>
          </div>
        )}
      </div>

      {/* System Information */}
      <div className="card p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">System Information</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Storage</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Total storage used: {stats?.total_storage || 'N/A'}</li>
              <li>• Average file size: {stats?.total_photos > 0 ? 'Calculated' : 'N/A'}</li>
              <li>• Thumbnail cache: Active</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Face Recognition</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Model: HOG (CPU optimized)</li>
              <li>• Tolerance: 0.6 (adjustable)</li>
              <li>• Clustering: DBSCAN algorithm</li>
              <li>• Processing: Background queue</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Admin;