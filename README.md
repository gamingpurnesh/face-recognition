# Smart Wedding Photo Album Website

A web-based application that automatically groups wedding photos into albums based on facial recognition, making it easy for guests to find and download photos of themselves.

## Features

- **Automatic Face Detection**: Uses AI to detect and recognize faces in uploaded photos
- **Smart Grouping**: Groups photos by individuals appearing in them
- **Dynamic Albums**: Creates personalized albums for each person
- **Easy Sharing**: Guests can view and download their photos without registration
- **Admin Tools**: Manage albums, rename people, and merge similar faces
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: React + TailwindCSS
- **Backend**: Python Flask + face_recognition
- **Database**: SQLite (development) / PostgreSQL (production)
- **Storage**: Local filesystem (development) / Cloud storage (production)

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd face-recognition
```

2. Set up the backend:
```bash
cd backend
pip install -r requirements.txt
python app.py
```

3. Set up the frontend:
```bash
cd frontend
npm install
npm start
```

4. Open your browser and navigate to `http://localhost:3000`

### Docker Setup

```bash
docker-compose up --build
```

## Usage

1. **Upload Photos**: Drag and drop wedding photos or use the file picker
2. **Wait for Processing**: The system will detect faces and group them automatically
3. **View Albums**: Browse through generated albums for each person
4. **Download**: Download individual photos or entire albums
5. **Admin Features**: Rename albums, merge similar faces, manage content

## API Documentation

The backend provides RESTful APIs for:
- Photo upload and management
- Face detection and recognition
- Album creation and retrieval
- User management

## Security Features

- File type validation
- Size limits on uploads
- Secure file storage
- Input sanitization
- HTTPS support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details