# Akool Image Generation Demo

A full-stack web application demonstrating the Akool Image Generation API. This demo supports both text-to-image and image-to-image generation, with features for creating 4K upscales and variations.

## Features

- 🔐 **Dual Authentication**: Support for both API Key and Client Credentials (OAuth2) authentication
- 🎨 **Text-to-Image**: Generate images from text prompts
- 🖼️ **Image-to-Image**: Transform existing images using prompts
- 📐 **Multiple Aspect Ratios**: Support for various image scales (1:1, 4:3, 16:9, etc.)
- ⬆️ **4K Upscaling**: Generate high-resolution versions of images
- 🔄 **Variations**: Create multiple variations of generated images
- 📊 **Real-time Status**: Polling system to track generation progress
- 🖼️ **Image Gallery**: View and manage multiple generated images
- 💾 **Download Support**: Save generated images locally

## Tech Stack

### Backend
- **Node.js** with **Express.js**
- **Express Session** for authentication management
- **Axios** for HTTP requests to Akool API
- **CORS** enabled for frontend communication

### Frontend
- **React.js** with **Vite**
- **React Router** for navigation
- **Tailwind CSS** for styling (dark navy theme)
- **Axios** for API communication

## Project Structure

```
image-generation/
├── backend/
│   ├── routes/
│   │   └── akool.js          # Akool API proxy routes
│   ├── server.js             # Express server
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx     # Authentication component
│   │   │   └── Demo.jsx      # Main demo interface
│   │   ├── services/
│   │   │   └── api.js        # API service layer
│   │   ├── App.jsx           # Main app component
│   │   ├── main.jsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Akool API credentials (API Key or Client ID/Secret)

### run using start.sh
```bash
./start.sh
```

or

```bash
cd backend
npm start
```


```bash
cd frontend
npm run dev
```
## OR 



### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Create a `.env` file:
```bash
PORT=5000
SESSION_SECRET=your-random-secret-key-here
```

4. Start the backend server:
```bash
npm start
```

The server will run on `http://localhost:5000`

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The frontend will run on `http://localhost:5173`

## Usage

### 1. Authentication

When you first open the application, you'll be prompted to login. You can choose between two authentication methods:

#### Option A: API Key
- Select "API Key" radio button
- Enter your Akool API Key
- Click "Login"

#### Option B: Client Credentials
- Select "Client Credentials" radio button
- Enter your Client ID and Client Secret
- Click "Login"

The backend will handle token retrieval automatically for client credentials.

### 2. Generate Images

1. **Enter a Prompt**: Describe the image you want to generate
2. **Select Aspect Ratio**: Choose from available scales (1:1, 4:3, 16:9, etc.)
3. **Optional - Source Image URL**: For image-to-image generation, provide a URL to an existing image
4. **Click "Generate Image"**: The system will start processing your request

### 3. Monitor Progress

- The status will update automatically (Queueing → Processing → Completed)
- Images appear in the gallery once generation is complete
- Failed generations will show an error status

### 4. Create Variations & Upscales

Once an image is completed:
- **U1-U4 buttons**: Generate 4K upscaled versions
- **V1-V4 buttons**: Generate variations of the image
- Click any button to create a new generation based on the original

### 5. Download Images

- Click the "Download" button on any completed image
- Images are valid for 7 days - download them promptly!

## API Endpoints

### Backend Endpoints

- `POST /api/login` - Authenticate with API key or client credentials
- `POST /api/logout` - Clear session
- `GET /api/auth/check` - Check authentication status
- `POST /api/generate` - Generate image from prompt
- `POST /api/variant` - Create variant or upscale
- `GET /api/status/:id` - Get image generation status

### Akool API Endpoints (Proxied)

All Akool API calls are proxied through the backend for security:
- `POST /api/open/v3/content/image/createbyprompt` - Text/Image to Image
- `POST /api/open/v3/content/image/createbybutton` - Variants/Upscales
- `GET /api/open/v3/content/image/infobymodelid` - Get Status

## Error Handling

The application handles various error codes from the Akool API:

- **1003**: Parameter error or missing parameters
- **1008**: Content does not exist
- **1009**: Permission denied
- **1010**: Cannot operate this content
- **1101**: Invalid authorization or expired token
- **1102**: Authorization cannot be empty
- **1108**: Image generation error
- **1200**: Account banned

## Important Notes

⚠️ **Resource Expiration**: Generated images are valid for 7 days. Please download and save them promptly.

⚠️ **Content Policy**: This is a demo application. Please use responsibly and ensure generated content is appropriate.

⚠️ **API Keys**: Never expose your API keys in the frontend. All API calls are proxied through the backend.

## Development

### Backend Development

```bash
cd backend
npm run dev  # Uses node --watch for auto-reload
```

### Frontend Development

```bash
cd frontend
npm run dev  # Vite dev server with hot reload
```

### Building for Production

**Frontend:**
```bash
cd frontend
npm run build
```

The built files will be in `frontend/dist/`

## Troubleshooting

### CORS Issues
- Ensure the backend CORS is configured for your frontend URL
- Check that credentials are enabled in axios requests

### Authentication Errors
- Verify your API key or client credentials are correct
- Check that the session is being maintained (cookies enabled)
- Try logging out and logging back in

### Image Generation Fails
- Check the error message for specific error codes
- Verify your account has sufficient credits
- Ensure prompts are appropriate and not violating content policies

### Polling Not Working
- Check browser console for errors
- Verify the image model ID is correct
- Ensure the backend is running and accessible

## License

MIT License - Feel free to use this demo for learning and development purposes.

## Support

For API documentation and support, visit:
- [Akool Documentation](https://docs.akool.com)
- [Image Generation API Docs](https://docs.akool.com/ai-tools-suite/image-generate)

## Contributing

This is a demo application. Feel free to fork and modify for your own use.

---

**Built with ❤️ for the Akool Image Generation API**

# akool-image-generation
