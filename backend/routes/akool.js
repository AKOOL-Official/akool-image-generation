import express from 'express';
import axios from 'axios';

const router = express.Router();

const AKOOL_BASE_URL = 'https://openapi.akool.com/api/open/v3';
const TOKEN_URL = `${AKOOL_BASE_URL}/getToken`;

/**
 * Get authentication headers based on session
 */
const getAuthHeaders = (req) => {
  const auth = req.session.auth;
  if (!auth) {
    throw new Error('Not authenticated');
  }

  if (auth.type === 'apikey') {
    return {
      'x-api-key': auth.apiKey
    };
  } else if (auth.type === 'token') {
    return {
      'Authorization': `Bearer ${auth.token}`
    };
  }
  throw new Error('Invalid authentication type');
};

/**
 * POST /api/login
 * Authenticate user with either API key or client credentials
 */
router.post('/login', async (req, res) => {
  try {
    const { authType, apiKey, clientId, clientSecret } = req.body;

    if (!authType || (authType !== 'apikey' && authType !== 'token')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid authType. Must be "apikey" or "token"'
      });
    }

    if (authType === 'apikey') {
      if (!apiKey) {
        return res.status(400).json({
          success: false,
          error: 'API key is required'
        });
      }

      // Store API key in session
      req.session.auth = {
        type: 'apikey',
        apiKey: apiKey
      };

      return res.json({
        success: true,
        authType: 'apikey',
        message: 'Authentication successful'
      });
    } else {
      // Token-based authentication
      if (!clientId || !clientSecret) {
        return res.status(400).json({
          success: false,
          error: 'Client ID and Client Secret are required'
        });
      }

      // Get token from Akool
      try {
        const tokenResponse = await axios.post(TOKEN_URL, {
          clientId,
          clientSecret
        });
console.log("tokenResponse");
console.log(tokenResponse.data);


        if (tokenResponse.data.code === 1000 && tokenResponse.data.token) {
          const token = tokenResponse.data.token;

          // Store token in session
          req.session.auth = {
            type: 'token',
            token: token,
            clientId: clientId
          };

          return res.json({
            success: true,
            authType: 'token',
            message: 'Authentication successful',
            token: token // Return token for client-side storage if needed
          });
        } else {
          return res.status(401).json({
            success: false,
            error: 'Failed to get token',
            message: tokenResponse.data.msg || 'Invalid credentials'
          });
        }
      } catch (error) {
        console.error('Token request error:', error.response?.data || error.message);
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          message: error.response?.data?.msg || error.message
        });
      }
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

/**
 * POST /api/generate
 * Generate image from prompt (text-to-image or image-to-image)
 */
router.post('/generate', async (req, res) => {
  try {
    const authHeaders = getAuthHeaders(req);
    const { prompt, scale, source_image, webhookUrl } = req.body;

    if (!prompt) {
      return res.status(400).json({
        success: false,
        error: 'Prompt is required'
      });
    }

    const requestBody = {
      prompt,
      scale: scale || '1:1',
      webhookUrl: webhookUrl || ''
    };
    console.log("requestBody generate");
    console.log(requestBody);
    
    // Add source_image if provided (for image-to-image)
    if (source_image) {
      requestBody.source_image = source_image;
    }

    const response = await axios.post(
      `${AKOOL_BASE_URL}/content/image/createbyprompt`,
      requestBody,
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code === 1000) {
      res.json({
        success: true,
        data: response.data.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.data.msg || 'Failed to generate image',
        code: response.data.code,
        data: response.data.data
      });
    }
  } catch (error) {
    console.error('Generate error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to generate image',
      message: error.response?.data?.msg || error.message,
      code: error.response?.data?.code
    });
  }
});

/**
 * POST /api/variant
 * Generate 4K upscale or variation
 */
router.post('/variant', async (req, res) => {
  try {
    const authHeaders = getAuthHeaders(req);
    const { _id, button, webhookUrl } = req.body;

    if (!_id || !button) {
      return res.status(400).json({
        success: false,
        error: '_id and button are required'
      });
    }

    const requestBody = {
      _id,
      button,
      webhookUrl: webhookUrl || ''
    };

    const response = await axios.post(
      `${AKOOL_BASE_URL}/content/image/createbybutton`,
      requestBody,
      {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.data.code === 1000) {
      res.json({
        success: true,
        data: response.data.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.data.msg || 'Failed to create variant',
        code: response.data.code,
        data: response.data.data
      });
    }
  } catch (error) {
    console.error('Variant error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to create variant',
      message: error.response?.data?.msg || error.message,
      code: error.response?.data?.code
    });
  }
});

/**
 * GET /api/status/:id
 * Get image generation status and result
 */
router.get('/status/:id', async (req, res) => {
  try {
    const authHeaders = getAuthHeaders(req);
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        error: 'Image model ID is required'
      });
    }

    const response = await axios.get(
      `${AKOOL_BASE_URL}/content/image/infobymodelid`,
      {
        params: {
          image_model_id: id
        },
        headers: authHeaders
      }
    );

    if (response.data.code === 1000) {
      res.json({
        success: true,
        data: response.data.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: response.data.msg || 'Failed to get status',
        code: response.data.code,
        data: response.data.data
      });
    }
  } catch (error) {
    console.error('Status error:', error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to get status',
      message: error.response?.data?.msg || error.message,
      code: error.response?.data?.code
    });
  }
});

/**
 * GET /api/logout
 * Clear session
 */
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({
        success: false,
        error: 'Failed to logout'
      });
    }
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  });
});

/**
 * GET /api/auth/check
 * Check if user is authenticated
 */
router.get('/auth/check', (req, res) => {
  if (req.session.auth) {
    res.json({
      authenticated: true,
      authType: req.session.auth.type
    });
  } else {
    res.json({
      authenticated: false
    });
  }
});

export default router;

