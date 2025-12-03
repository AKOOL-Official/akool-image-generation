import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [authType, setAuthType] = useState('apikey');
  const [apiKey, setApiKey] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const credentials = {
        authType,
        ...(authType === 'apikey' ? { apiKey } : { clientId, clientSecret })
      };

      const response = await authAPI.login(credentials);

      if (response.success) {
        // Store auth info in localStorage for persistence
        localStorage.setItem('authType', authType);
        if (authType === 'token' && response.token) {
          // Token is stored in session, but we can store type for UI
          localStorage.setItem('hasToken', 'true');
        }
        onLogin();
        navigate('/demo');
      } else {
        setError(response.error || response.message || 'Authentication failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-navy-dark flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-navy-darker rounded-lg shadow-xl p-8 border border-gray-800">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Akool Image Generation</h1>
            <p className="text-gray-400">Demo Application</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Auth Type Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Authentication Method
              </label>
              <div className="flex gap-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="authType"
                    value="apikey"
                    checked={authType === 'apikey'}
                    onChange={(e) => setAuthType(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-gray-300">API Key</span>
                </label>
                <label className="flex items-center cursor-pointer">
                  <input
                    type="radio"
                    name="authType"
                    value="token"
                    checked={authType === 'token'}
                    onChange={(e) => setAuthType(e.target.value)}
                    className="mr-2"
                  />
                  <span className="text-gray-300">Client Credentials</span>
                </label>
              </div>
            </div>

            {/* API Key Input */}
            {authType === 'apikey' && (
              <div>
                <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-2">
                  API Key
                </label>
                <input
                  id="apiKey"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your API key"
                  required
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Client Credentials Inputs */}
            {authType === 'token' && (
              <>
                <div>
                  <label htmlFor="clientId" className="block text-sm font-medium text-gray-300 mb-2">
                    Client ID
                  </label>
                  <input
                    id="clientId"
                    type="text"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    placeholder="Enter your Client ID"
                    required
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-300 mb-2">
                    Client Secret
                  </label>
                  <input
                    id="clientSecret"
                    type="password"
                    value={clientSecret}
                    onChange={(e) => setClientSecret(e.target.value)}
                    placeholder="Enter your Client Secret"
                    required
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Authenticating...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            <p>Get your API credentials from</p>
            <a
              href="https://docs.akool.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline"
            >
              Akool Documentation
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

