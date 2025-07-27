import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Users, Download, Search, User } from 'lucide-react';
import { apiService } from '../services/api';
import { generateAvatarColor, getInitials, downloadFile } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const Albums = () => {
  const [albums, setAlbums] = useState([]);
  const [filteredAlbums, setFilteredAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [downloadingAlbums, setDownloadingAlbums] = useState(new Set());

  useEffect(() => {
    fetchAlbums();
  }, []);

  useEffect(() => {
    // Filter albums based on search term
    if (searchTerm.trim() === '') {
      setFilteredAlbums(albums);
    } else {
      const filtered = albums.filter(album =>
        album.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAlbums(filtered);
    }
  }, [albums, searchTerm]);

  const fetchAlbums = async () => {
    try {
      const response = await apiService.getAlbums();
      setAlbums(response.data.albums);
      setFilteredAlbums(response.data.albums);
    } catch (error) {
      console.error('Failed to fetch albums:', error);
      toast.error('Failed to load albums');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadAlbum = async (album) => {
    if (downloadingAlbums.has(album.id)) return;

    setDownloadingAlbums(prev => new Set([...prev, album.id]));

    try {
      const response = await apiService.downloadAlbum(album.id);
      const filename = `${album.name.replace(/[^a-z0-9]/gi, '_')}_photos.zip`;
      downloadFile(response.data, filename);
      toast.success(`Downloaded ${album.name}'s photos`);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download album');
    } finally {
      setDownloadingAlbums(prev => {
        const newSet = new Set(prev);
        newSet.delete(album.id);
        return newSet;
      });
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading albums..." />;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <Users className="h-16 w-16 text-primary-600 mx-auto mb-4" />
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Photo Albums
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Browse through personalized photo albums created for each person. 
          Click on any album to view all photos featuring that person.
        </p>
      </div>

      {/* Search and Stats */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search albums by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="text-sm text-gray-600">
          {filteredAlbums.length} album{filteredAlbums.length !== 1 ? 's' : ''} found
        </div>
      </div>

      {/* Albums Grid */}
      {filteredAlbums.length === 0 ? (
        <div className="text-center py-12">
          {albums.length === 0 ? (
            <div>
              <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No albums yet
              </h3>
              <p className="text-gray-600 mb-6">
                Upload some photos to start creating personalized albums.
              </p>
              <Link to="/upload" className="btn-primary">
                Upload Photos
              </Link>
            </div>
          ) : (
            <div>
              <Search className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                No albums match your search
              </h3>
              <p className="text-gray-600">
                Try adjusting your search terms or browse all albums.
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredAlbums.map((album) => (
            <div key={album.id} className="card group hover:shadow-lg transition-all duration-200">
              {/* Album Cover */}
              <div className="aspect-square overflow-hidden relative">
                {album.representative_face ? (
                  <img
                    src={apiService.getPhotoImage(album.representative_face.photo_id, true)}
                    alt={album.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${generateAvatarColor(album.name)}`}>
                    <User className="h-16 w-16 text-white" />
                  </div>
                )}
                
                {/* Photo count overlay */}
                <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                  {album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}
                </div>
              </div>

              {/* Album Info */}
              <div className="p-4">
                <h3 className="font-semibold text-gray-900 mb-2 truncate" title={album.name}>
                  {album.name}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {album.photo_count} photo{album.photo_count !== 1 ? 's' : ''}
                </p>

                {/* Actions */}
                <div className="flex space-x-2">
                  <Link
                    to={`/albums/${album.id}`}
                    className="flex-1 btn-primary text-sm text-center"
                  >
                    View Album
                  </Link>
                  <button
                    onClick={() => handleDownloadAlbum(album)}
                    disabled={downloadingAlbums.has(album.id)}
                    className="btn-secondary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Download all photos"
                  >
                    {downloadingAlbums.has(album.id) ? (
                      <div className="loading-spinner h-4 w-4"></div>
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">
          How Albums Work
        </h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Automatic Creation:</h4>
            <ul className="space-y-1">
              <li>• Albums are created automatically when photos are uploaded</li>
              <li>• Each unique face gets its own album</li>
              <li>• Similar faces are grouped together using AI</li>
              <li>• Albums update automatically as new photos are added</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Sharing & Downloading:</h4>
            <ul className="space-y-1">
              <li>• Share album links directly with guests</li>
              <li>• No registration required for viewing</li>
              <li>• Download individual photos or entire albums</li>
              <li>• Albums can be renamed by administrators</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Albums;