# CalmKit Server

Backend API server for CalmKit - a mental wellness application with emotion logging, AI-powered coaching, anchor phrases, and guided routines.

## 🌟 Features

### Core Functionality

- **User Authentication** - JWT-based authentication with secure token management
- **Emotion Logging** - Track emotions with encryption support for privacy
- **AI Chat Integration** - Google Gemini AI for conversational wellness support
- **Anchor Phrases** - Curated and custom grounding phrases with favorites system
- **Guided Routines** - Wellness exercises and breathing techniques
- **Mood Analytics** - Daily and monthly mood trend calculations
- **Data Encryption** - Optional end-to-end encryption for sensitive user data
- **Health Checks** - API and database connectivity monitoring

### API Documentation

- **Swagger/OpenAPI** - Auto-generated API documentation at `/doc`
- **Interactive UI** - Test endpoints directly from the Swagger interface

## 🛠️ Technology Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express 5
- **Database**: MongoDB with Mongoose ODM
- **AI Integration**: Google Gemini API (`@google/genai`)
- **Authentication**: JWT (jsonwebtoken) with bcryptjs for password hashing
- **API Documentation**: Swagger UI with swagger-autogen
- **Security**: CORS enabled, AES-256-GCM encryption for sensitive data
- **Build Tool**: esbuild for production bundling

## 📋 Prerequisites

- Node.js v18 or higher
- MongoDB (local instance or MongoDB Atlas)
- Google Gemini API key (for AI chat features)

## 🚀 Installation

1. Navigate to the backend directory:

```bash
cd backend/CalmKit-Server
```

2. Install dependencies:

```bash
npm install
```

3. Configure environment variables:

Create a `.env` file in the root directory:

```env
MONGO_URI=mongodb://localhost:27017/calmkit
JWT_SECRET=your_jwt_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
HOST=0.0.0.0
```

### Environment Variables

| Variable         | Description                              | Default     | Required |
| ---------------- | ---------------------------------------- | ----------- | -------- |
| `MONGO_URI`      | MongoDB connection string                | -           | ✅       |
| `JWT_SECRET`     | Secret key for JWT token signing         | -           | ✅       |
| `GEMINI_API_KEY` | Google Gemini API key for AI chat        | -           | ✅       |
| `PORT`           | Server port                              | `5000`      | ❌       |
| `HOST`           | Server host (use 0.0.0.0 for LAN access) | `localhost` | ❌       |

## 💻 Usage

### Development Mode

Start the development server with LAN access:

```bash
npm run dev
```

Server will be available at `http://0.0.0.0:3001` (accessible from network)

### Production Mode

Run the server directly:

```bash
npm start
```

### Build for Production

Build an optimized bundle (for ARM deployment):

```bash
npm run build
```

This creates a bundled version in `dist/server.js` optimized for ARMv6 (Raspberry Pi Zero W).

Run the production build:

```bash
npm run start-build
```

### Generate API Documentation

Regenerate the OpenAPI specification:

```bash
npm run swagger
```

This updates `openapi.json` based on route annotations.

## 🔐 Authentication

All protected endpoints require a JWT token in the `x-auth-token` header:

```javascript
headers: {
  'x-auth-token': 'your_jwt_token_here'
}
```

## 🔒 Data Encryption

User emotion logs can be encrypted using AES-256-GCM encryption. When a user sets a passphrase:

1. A client-side salt and encryption key are generated
2. The encryption key is stored in the user's document
3. All new logs are encrypted before storage
4. Decryption happens server-side when fetching logs

## 🤝 Contributing

When contributing to the backend:

1. Follow existing code structure and patterns
2. Add Swagger annotations to new endpoints
3. Update this README if adding new features
4. Test with both encrypted and non-encrypted data flows

## 📄 License

This project is private and proprietary.

## 🙏 Acknowledgments

Built with Express, MongoDB, and Google Gemini AI to provide accessible mental wellness support.
