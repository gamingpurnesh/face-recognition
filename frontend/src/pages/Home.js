import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Users, Camera, Zap, Shield, Download } from 'lucide-react';
import { apiService } from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';

const Home = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await apiService.getStats();
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    {
      icon: Camera,
      title: 'Smart Face Detection',
      description: 'Advanced AI automatically detects and recognizes faces in your wedding photos.'
    },
    {
      icon: Users,
      title: 'Automatic Grouping',
      description: 'Photos are intelligently grouped by person, creating personalized albums for each guest.'
    },
    {
      icon: Download,
      title: 'Easy Sharing',
      description: 'Guests can easily find and download all photos featuring them without registration.'
    },
    {
      icon: Zap,
      title: 'Fast Processing',
      description: 'Quick upload and processing means your albums are ready in minutes, not hours.'
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your photos are processed securely with privacy protection built-in.'
    }
  ];

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Smart Wedding Photo
          <span className="text-gradient block">Album</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
          Automatically organize your wedding photos by faces using AI. 
          Let your guests easily find and download all the photos they appear in.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/upload" className="btn-primary text-lg px-8 py-3">
            <Upload className="h-5 w-5 mr-2" />
            Upload Photos
          </Link>
          <Link to="/albums" className="btn-secondary text-lg px-8 py-3">
            <Users className="h-5 w-5 mr-2" />
            View Albums
          </Link>
        </div>
      </div>

      {/* Stats Section */}
      {!loading && stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {stats.total_photos}
            </div>
            <div className="text-sm text-gray-600">Photos Uploaded</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {stats.total_persons}
            </div>
            <div className="text-sm text-gray-600">People Found</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {stats.total_faces}
            </div>
            <div className="text-sm text-gray-600">Faces Detected</div>
          </div>
          <div className="card p-6 text-center">
            <div className="text-3xl font-bold text-primary-600 mb-2">
              {Math.round(stats.processing_progress)}%
            </div>
            <div className="text-sm text-gray-600">Processed</div>
          </div>
        </div>
      )}

      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card p-6">
              <LoadingSpinner size="sm" text="" />
            </div>
          ))}
        </div>
      )}

      {/* Features Section */}
      <div>
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="card p-6 text-center hover:shadow-lg transition-shadow duration-200">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-lg mb-4">
                  <Icon className="h-6 w-6 text-primary-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* How to Use Section */}
      <div className="bg-gradient-to-r from-primary-50 to-pink-50 rounded-2xl p-8 md:p-12">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-8">
          Get Started in 3 Simple Steps
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-2xl font-bold mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Upload Photos
            </h3>
            <p className="text-gray-600">
              Drag and drop your wedding photos or select them from your device. 
              The system supports JPG and PNG formats.
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-2xl font-bold mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              AI Processing
            </h3>
            <p className="text-gray-600">
              Our AI automatically detects faces and groups similar faces together, 
              creating personalized albums for each person.
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-2xl font-bold mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Share & Download
            </h3>
            <p className="text-gray-600">
              Share the album link with your guests. They can browse and download 
              all photos featuring them with just a few clicks.
            </p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-white rounded-2xl p-8 md:p-12 shadow-sm border border-gray-200">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Ready to Create Your Smart Album?
        </h2>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Start uploading your wedding photos now and let AI do the magic of organizing them by faces.
        </p>
        <Link to="/upload" className="btn-primary text-lg px-8 py-3 inline-flex items-center">
          <Upload className="h-5 w-5 mr-2" />
          Start Uploading
        </Link>
      </div>
    </div>
  );
};

export default Home;