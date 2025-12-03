import { useState, useEffect, useCallback, useRef } from 'react';
import { imageAPI } from '../services/api';

const SCALE_OPTIONS = [
  { value: '1:1', label: '1:1 (Square)' },
  { value: '4:3', label: '4:3 (Landscape)' },
  { value: '3:4', label: '3:4 (Portrait)' },
  { value: '16:9', label: '16:9 (Widescreen)' },
  { value: '9:16', label: '9:16 (Vertical)' },
  { value: '3:2', label: '3:2 (Photo)' },
  { value: '2:3', label: '2:3 (Portrait Photo)' }
];

const STATUS_LABELS = {
  1: { text: 'Queueing', color: 'text-yellow-400' },
  2: { text: 'Processing', color: 'text-blue-400' },
  3: { text: 'Completed', color: 'text-green-400' },
  4: { text: 'Failed', color: 'text-red-400' }
};

const Demo = ({ onLogout }) => {
  const [prompt, setPrompt] = useState('Sun Wukong is surrounded by heavenly soldiers and generals');
  const [scale, setScale] = useState('1:1');
  const [sourceImageUrl, setSourceImageUrl] = useState('https://drz0f01yeq1cx.cloudfront.net/1708333063911-9cbe39b7-3c5f-4a35-894c-359a6cbb76c3-3283.png');
  const [sourceImagePreview, setSourceImagePreview] = useState('https://drz0f01yeq1cx.cloudfront.net/1708333063911-9cbe39b7-3c5f-4a35-894c-359a6cbb76c3-3283.png');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [generations, setGenerations] = useState([]);
  const pollingIntervalsRef = useRef({});

  // Handle source image URL change
  useEffect(() => {
    if (sourceImageUrl) {
      setSourceImagePreview(sourceImageUrl);
    } else {
      setSourceImagePreview('');
    }
  }, [sourceImageUrl]);

  // Polling function
  const pollStatus = useCallback(async (imageId) => {
    try {
      const response = await imageAPI.getStatus(imageId);
      
      if (response.success && response.data) {
        const data = response.data;
        const status = data.image_status;

        // Get upscaled URLs and image from response
        const upscaledUrls = data.upscaled_urls || [];
        const hasUpscaledUrls = upscaledUrls.length > 0;
        const imageUrl = data.image || data.external_img || null;
        const hasImage = !!imageUrl;

        setGenerations(prev => {
          return prev.map(gen => {
            // Update the generation that matches the polled imageId
            if (gen.id === imageId) {
              const usedButtonsFromApi = Array.isArray(data.used_buttons) ? data.used_buttons : [];
              const isUpscale = gen.isUpscale || (gen.button && gen.button.startsWith('U'));
              
              // Determine if we should stop polling
              let shouldStop = false;
              if (isUpscale) {
                // U1-U4: Stop when status === 3 AND upscaled_urls is empty AND image exists
                shouldStop = status === 4 || (status === 3 && !hasUpscaledUrls && hasImage);
              } else {
                // V1-V4 or initial: Stop when status === 3 AND upscaled_urls is not empty
                shouldStop = status === 4 || (status === 3 && hasUpscaledUrls);
              }
              
              if (shouldStop) {
                const intervalId = pollingIntervalsRef.current[imageId];
                if (intervalId) {
                  clearInterval(intervalId);
                  delete pollingIntervalsRef.current[imageId];
                }
              }
              
              if (isUpscale) {
                // U1-U4: Store the single image
                return {
                  ...gen,
                  status,
                  image: imageUrl || gen.image,
                  source_image: data.source_image || gen.source_image,
                  upscaled_urls: [], // Keep empty for U1-U4
                  buttons: [], // Hide buttons
                  used_buttons: usedButtonsFromApi,
                  image_status: status,
                  prompt: data.prompt || gen.prompt,
                  origin_prompt: data.origin_prompt || gen.origin_prompt
                };
              } else {
                // V1-V4 or initial: Store upscaled_urls
                return {
                  ...gen,
                  status,
                  image: imageUrl || gen.image,
                  source_image: data.source_image || gen.source_image,
                  upscaled_urls: upscaledUrls,
                  buttons: gen.variantOf ? [] : (Array.isArray(data.buttons) ? data.buttons : []), // Hide buttons for variants
                  used_buttons: usedButtonsFromApi,
                  image_status: status,
                  prompt: data.prompt || gen.prompt,
                  origin_prompt: data.origin_prompt || gen.origin_prompt
                };
              }
            }
            
            // For other generations, return unchanged
            return gen;
          });
        });
      }
    } catch (err) {
      console.error('Polling error:', err);
      // Continue polling on error (might be temporary)
    }
  }, []);

  // Start polling for a generation
  const startPolling = useCallback((imageId) => {
    // Poll immediately
    pollStatus(imageId);

    // Then poll every 3 seconds
    const interval = setInterval(() => {
      pollStatus(imageId);
    }, 3000);

    pollingIntervalsRef.current[imageId] = interval;
  }, [pollStatus]);

  // Cleanup polling intervals on unmount
  useEffect(() => {
    return () => {
      Object.values(pollingIntervalsRef.current).forEach(interval => clearInterval(interval));
      pollingIntervalsRef.current = {};
    };
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const params = {
        prompt,
        scale,
        ...(sourceImageUrl && { source_image: sourceImageUrl })
      };

      const response = await imageAPI.generate(params);

      if (response.success && response.data) {
        const imageId = response.data._id;
        const newGeneration = {
          id: imageId,
          prompt,
          scale,
          sourceImageUrl,
          status: response.data.image_status || 1,
          image: null,
          source_image: response.data.source_image || sourceImageUrl,
          upscaled_urls: [],
          buttons: [],
          used_buttons: [],
          createdAt: new Date().toISOString()
        };

        setGenerations(prev => [newGeneration, ...prev]);
        startPolling(imageId);

        setSuccess('Image generation started! Polling for status...');
        setPrompt(''); // Clear prompt after successful submission
        setSourceImageUrl('');
        setSourceImagePreview('');
      } else {
        setError(response.error || response.message || 'Failed to generate image');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to generate image';
      setError(errorMessage);
      
      // Handle specific error codes
      if (err.response?.data?.code === 1101) {
        setError('Authentication expired. Please login again.');
      } else if (err.response?.data?.code === 1108) {
        setError('Image generation error. Please try again later.');
      } else if (err.response?.data?.code === 1200) {
        setError('Account has been banned.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVariant = async (imageId, button) => {
    setError('');
    setLoading(true);

    try {
      const response = await imageAPI.createVariant({
        _id: imageId,
        button
      });

      if (response.success && response.data) {
        const newImageId = response.data._id;
        const isUpscale = button.startsWith('U');
        
        // Find the parent generation to get its details
        const parentGen = generations.find(gen => gen.id === imageId);
        
        // Create a NEW generation card for V1-V4 or U1-U4
        const newGeneration = {
          id: newImageId,
          prompt: parentGen?.prompt || '',
          origin_prompt: parentGen?.origin_prompt || parentGen?.prompt || '',
          scale: parentGen?.scale || '1:1',
          sourceImageUrl: parentGen?.sourceImageUrl || '',
          status: response.data.image_status || 1,
          image: null,
          source_image: parentGen?.source_image || parentGen?.sourceImageUrl || '',
          upscaled_urls: [],
          buttons: [], // Hide buttons for variant/upscale results
          used_buttons: [],
          variantOf: imageId,
          button,
          isUpscale: isUpscale, // Track if this is an upscale
          createdAt: new Date().toISOString()
        };

        // Add new generation ABOVE previous results (don't modify existing ones)
        setGenerations(prev => [newGeneration, ...prev]);
        startPolling(newImageId);

        setSuccess(`Variant generation started (${button})!`);
      } else {
        setError(response.error || response.message || 'Failed to create variant');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to create variant';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (imageUrl, prompt) => {
    try {
      // Try to fetch the image and create a blob for download
      // This works even with CORS if the server allows it
      const response = await fetch(imageUrl);
      if (response.ok) {
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `akool-image-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        // Clean up the blob URL
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // If fetch fails, open in new tab
        window.open(imageUrl, '_blank');
      }
    } catch (error) {
      // If there's a CORS issue or other error, open in new tab
      console.warn('Download failed, opening in new tab:', error);
      window.open(imageUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-navy-dark text-white">
      {/* Header */}
      <header className="bg-navy-darker border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">Akool Image Generation Demo</h1>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Generation Form */}
        <div className="bg-navy-darker rounded-lg shadow-xl p-6 mb-8 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Generate Image</h2>
          
          <form onSubmit={handleGenerate} className="space-y-4">
            {/* Prompt Input */}
            <div>
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-2">
                Prompt <span className="text-red-400">*</span>
              </label>
              <textarea
                id="prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                required
                rows={4}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Scale Selector */}
            <div>
              <label htmlFor="scale" className="block text-sm font-medium text-gray-300 mb-2">
                Aspect Ratio
              </label>
              <select
                id="scale"
                value={scale}
                onChange={(e) => setScale(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SCALE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Source Image URL Input */}
            <div>
              <label htmlFor="sourceImage" className="block text-sm font-medium text-gray-300 mb-2">
                Source Image URL (Optional - for Image-to-Image)
              </label>
              <input
                id="sourceImage"
                type="url"
                value={sourceImageUrl}
                onChange={(e) => setSourceImageUrl(e.target.value)}
                placeholder="https://example.com/image.png"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {sourceImagePreview && (
                <div className="mt-3">
                  <p className="text-sm text-gray-400 mb-2">Preview:</p>
                  <img
                    src={sourceImagePreview}
                    alt="Source preview"
                    className="max-w-xs max-h-48 rounded-lg border border-gray-700"
                    onError={() => setSourceImagePreview('')}
                  />
                </div>
              )}
            </div>

            {/* Messages */}
            {error && (
              <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-green-900/30 border border-green-700 text-green-200 px-4 py-3 rounded-lg text-sm">
                {success}
              </div>
            )}

            {/* Generate Button */}
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200"
            >
              {loading ? 'Generating...' : 'Generate Image'}
            </button>
          </form>

          {/* Warning */}
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700 rounded-lg text-sm text-yellow-200">
            ⚠️ Generated images are valid for 7 days. Please download and save them promptly.
          </div>
        </div>

        {/* Generations Gallery */}
        <div className="bg-navy-darker rounded-lg shadow-xl p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">Generated Images</h2>
          
          {generations.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p>No images generated yet. Create your first image above!</p>
            </div>
          ) : (
            <div className="space-y-6">
              {generations.map((gen) => (
                <GenerationCard
                  key={gen.id}
                  generation={gen}
                  onVariant={handleCreateVariant}
                  onDownload={handleDownload}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Generation Card Component
const GenerationCard = ({ generation, onVariant, onDownload }) => {
  const statusInfo = STATUS_LABELS[generation.status] || STATUS_LABELS[1];
  const isCompleted = generation.status === 3;
  const isFailed = generation.status === 4;
  const isProcessing = generation.status === 1 || generation.status === 2;
  const hasUpscaledUrls = generation.upscaled_urls && generation.upscaled_urls.length > 0;
  const hasImage = !!generation.image;
  const isUpscale = generation.isUpscale || (generation.button && generation.button.startsWith('U'));
  const thumbnailUrl = generation.source_image || generation.sourceImageUrl;
  const isVariantResult = !!generation.variantOf; // True if this is from U1-U4 or V1-V4 button

  // Hide result if completed but conditions not met:
  if (isCompleted) {
    if (isUpscale) {
      // U1-U4: Hide if image is missing
      if (!hasImage) {
        return null;
      }
    } else {
      // Generate (initial) or V1-V4: Hide if upscaled_urls is empty
      if (!hasUpscaledUrls) {
        return null;
      }
    }
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 w-full">
      {/* Status */}
      <div className="flex items-center justify-between mb-3">
        <span className={`text-sm font-medium ${statusInfo.color}`}>
          {statusInfo.text}
        </span>
        {generation.variantOf && (
          <span className="text-xs text-gray-500">
            Variant ({generation.button})
          </span>
        )}
      </div>

      {/* Images Display - Different layout for U1-U4 vs V1-V4/initial */}
      {isUpscale ? (
        // For U1-U4: Show single image
        <div className="mb-3">
          <div className="bg-gray-800 rounded-lg overflow-hidden w-40 h-40 mx-auto flex items-center justify-center relative group cursor-pointer"
               onClick={isCompleted && hasImage ? () => window.open(generation.image, '_blank') : undefined}
               title={isCompleted && hasImage ? 'Click to open in new tab' : undefined}>
            {isFailed ? (
              <div className="text-red-400 text-center p-2">
                <p className="text-xs">Failed</p>
              </div>
            ) : isCompleted && hasImage ? (
              <>
                <img
                  src={generation.image}
                  alt={generation.prompt}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                  <span className="text-white text-xs opacity-0 group-hover:opacity-100">Click to view</span>
                </div>
              </>
            ) : isProcessing ? (
              <div className="text-gray-500 text-center p-2">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-1"></div>
                <p className="text-xs">Processing...</p>
              </div>
            ) : (
              <div className="text-gray-500 text-center p-2">
                <p className="text-xs">Loading...</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // For V1-V4 or initial: Show 5 columns structure
        <div className="mb-3">
          <div className="grid grid-cols-5 gap-2">
            {/* Thumbnail (Column 1) */}
            <div className="bg-gray-800 rounded-lg overflow-hidden aspect-square flex items-center justify-center">
              {isFailed ? (
                <div className="text-red-400 text-center p-2">
                  <p className="text-xs">Failed</p>
                </div>
              ) : thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="Thumbnail"
                  className="w-full h-full object-contain"
                />
              ) : isProcessing ? (
                <div className="text-gray-500 text-center p-2">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : (
                <div className="text-gray-500 text-center p-2">
                  <p className="text-xs">Thumbnail</p>
                </div>
              )}
            </div>
            
            {/* 4 Upscaled Images (Columns 2-5) */}
            {[0, 1, 2, 3].map((index) => {
              const url = generation.upscaled_urls?.[index];
              const isReady = url && isCompleted;
              
              return (
                <div
                  key={index}
                  className={`bg-gray-800 rounded-lg overflow-hidden aspect-square flex items-center justify-center ${
                    isReady ? 'relative group cursor-pointer' : ''
                  }`}
                  onClick={isReady ? () => window.open(url, '_blank') : undefined}
                  title={isReady ? 'Click to open in new tab' : undefined}
                >
                  {isFailed ? (
                    <div className="text-red-400 text-center p-2">
                      <p className="text-xs">Failed</p>
                    </div>
                  ) : isReady ? (
                    <>
                      <img
                        src={url}
                        alt={`Upscaled ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity flex items-center justify-center">
                        <span className="text-white text-xs opacity-0 group-hover:opacity-100">Click to view</span>
                      </div>
                    </>
                  ) : isProcessing ? (
                    <div className="text-gray-500 text-center p-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                    </div>
                  ) : (
                    <div className="text-gray-500 text-center p-2">
                      <p className="text-xs">Loading...</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Prompt */}
      <p className="text-sm text-gray-300 mb-3 line-clamp-2">
        {generation.prompt || generation.origin_prompt || 'No prompt'}
      </p>

      {/* Scale */}
      <p className="text-xs text-gray-500 mb-3">
        Scale: {generation.scale}
      </p>

      {/* Actions - Show buttons only on first result (initial generation, not from U1-U4/V1-V4) */}
      {isCompleted &&
       !isVariantResult &&
       ((isUpscale && hasImage) || (!isUpscale && hasUpscaledUrls)) &&
       generation.buttons &&
       generation.buttons.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {/* Variant Buttons */}
          {generation.buttons.map((button) => {
            // Ensure used_buttons is an array and check if button is used
            const usedButtons = Array.isArray(generation.used_buttons) ? generation.used_buttons : [];
            const isUsed = usedButtons.includes(button);
            const isUpscale = button.startsWith('U');
            
            return (
              <button
                key={button}
                onClick={() => {
                  if (!isUsed) {
                    onVariant(generation.id, button);
                  }
                }}
                disabled={isUsed}
                className={`text-xs py-1.5 px-2 rounded transition-colors ${
                  isUsed
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed opacity-60'
                    : isUpscale
                    ? 'bg-purple-600 hover:bg-purple-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
                title={isUsed ? `${button} already used` : (isUpscale ? `Upscale ${button}` : `Variant ${button}`)}
              >
                {button} {isUsed && '✓'}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Demo;

