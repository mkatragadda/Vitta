/**
 * Admin Page: Intent Embeddings Generator
 *
 * SECURITY: This page is only accessible in development mode
 * Production builds will return 404
 *
 * Purpose: Generate and store embeddings for intent detection
 * Architecture: Browser-based to leverage Next.js API routes
 */

import { useState, useEffect } from 'react';
import { generateAllIntentEmbeddings, verifyIntentEmbeddings } from '../../services/embedding/intentEmbeddings';
import { INTENT_EXAMPLES } from '../../services/embedding/intentEmbeddings';

export default function AdminEmbeddingsPage() {
  const [status, setStatus] = useState('idle'); // idle | generating | verifying | complete | error
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [verification, setVerification] = useState(null);

  // Calculate total examples
  const totalExamples = Object.values(INTENT_EXAMPLES).reduce(
    (sum, examples) => sum + examples.length,
    0
  );

  const generateEmbeddings = async () => {
    try {
      setStatus('generating');
      setError(null);
      setProgress({ current: 0, total: totalExamples });

      console.log('[Admin] Starting embedding generation...');

      const result = await generateAllIntentEmbeddings();

      if (result.success) {
        setResult(result);
        setStatus('verifying');

        // Verify embeddings
        console.log('[Admin] Verifying embeddings...');
        const verification = await verifyIntentEmbeddings();

        setVerification(verification);
        setStatus('complete');
      } else {
        throw new Error(result.error || 'Failed to generate embeddings');
      }

    } catch (err) {
      console.error('[Admin] Error:', err);
      setError(err.message);
      setStatus('error');
    }
  };

  const resetAndRegenerate = async () => {
    setStatus('idle');
    setResult(null);
    setError(null);
    setVerification(null);
    setProgress({ current: 0, total: 0 });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl shadow-xl p-8 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Admin: Intent Embeddings</h1>
              <p className="text-purple-100">
                Generate and store embeddings for intent detection
              </p>
            </div>
            <div className="bg-white/20 rounded-full px-4 py-2 text-sm font-medium">
              DEV ONLY
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="text-3xl">⚠️</div>
            <div>
              <h3 className="font-bold text-yellow-900 mb-2">Important Notes</h3>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• This page is only accessible in development mode</li>
                <li>• Will make ~{totalExamples} API calls to OpenAI</li>
                <li>• Estimated cost: ~$0.01</li>
                <li>• Estimated time: ~{Math.ceil(totalExamples * 0.5)} seconds</li>
                <li>• Existing embeddings will be replaced</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">

          {/* Idle State */}
          {status === 'idle' && (
            <div className="text-center">
              <div className="text-6xl mb-4">🧠</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Generate Embeddings
              </h2>
              <p className="text-gray-600 mb-8">
                This will generate embeddings for all {totalExamples} intent examples
                across {Object.keys(INTENT_EXAMPLES).length} intents.
              </p>

              {/* Intent Breakdown */}
              <div className="bg-gray-50 rounded-xl p-6 mb-8">
                <h3 className="font-semibold text-gray-900 mb-4">Intent Breakdown:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {Object.entries(INTENT_EXAMPLES).map(([intent, examples]) => (
                    <div key={intent} className="flex justify-between">
                      <span className="text-gray-600">{intent}:</span>
                      <span className="font-medium text-gray-900">{examples.length} examples</span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={generateEmbeddings}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-4 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
              >
                Generate Embeddings
              </button>
            </div>
          )}

          {/* Generating State */}
          {status === 'generating' && (
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse">⚡</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Generating Embeddings...
              </h2>
              <p className="text-gray-600 mb-8">
                This will take about {Math.ceil(totalExamples * 0.5)} seconds. Please wait...
              </p>

              <div className="max-w-md mx-auto">
                <div className="bg-gray-200 rounded-full h-4 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-full transition-all duration-500"
                    style={{ width: '100%' }}
                  />
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  Processing with rate limiting to avoid API errors...
                </p>
              </div>
            </div>
          )}

          {/* Verifying State */}
          {status === 'verifying' && (
            <div className="text-center">
              <div className="text-6xl mb-4 animate-bounce">🔍</div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Verifying Embeddings...
              </h2>
              <p className="text-gray-600">
                Checking that all embeddings were stored correctly in Supabase...
              </p>
            </div>
          )}

          {/* Complete State */}
          {status === 'complete' && result && verification && (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-2xl font-bold text-green-600 mb-4">
                Embeddings Generated Successfully!
              </h2>

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 mb-6">
                <div className="grid grid-cols-2 gap-6 text-left">
                  <div>
                    <div className="text-sm text-green-700 font-medium mb-1">
                      Total Embeddings
                    </div>
                    <div className="text-3xl font-bold text-green-900">
                      {result.total}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-green-700 font-medium mb-1">
                      Intents Covered
                    </div>
                    <div className="text-3xl font-bold text-green-900">
                      {result.intents}
                    </div>
                  </div>
                </div>
              </div>

              {/* Verification Details */}
              {verification.byIntent && (
                <div className="bg-gray-50 rounded-xl p-6 mb-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Verification Results:</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {Object.entries(verification.byIntent).map(([intent, count]) => (
                      <div key={intent} className="flex justify-between items-center">
                        <span className="text-gray-600">{intent}:</span>
                        <span className="font-medium text-green-600">✓ {count} stored</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <button
                  onClick={() => window.location.href = '/'}
                  className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition-all shadow-lg hover:shadow-xl"
                >
                  Return to App
                </button>

                <button
                  onClick={resetAndRegenerate}
                  className="block w-full text-gray-600 hover:text-gray-900 py-2 text-sm font-medium"
                >
                  Regenerate Embeddings
                </button>
              </div>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h2 className="text-2xl font-bold text-red-600 mb-4">
                Error Generating Embeddings
              </h2>

              <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 mb-6">
                <p className="text-red-800 font-mono text-sm break-all">
                  {error}
                </p>
              </div>

              <div className="bg-yellow-50 rounded-xl p-6 mb-6 text-left">
                <h3 className="font-semibold text-gray-900 mb-3">Troubleshooting:</h3>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li>1. Check that OPENAI_API_KEY is set in .env.local</li>
                  <li>2. Verify Supabase connection is working</li>
                  <li>3. Ensure intent_embeddings table exists in Supabase</li>
                  <li>4. Check browser console for detailed error messages</li>
                  <li>5. Verify OpenAI API key has sufficient credits</li>
                </ul>
              </div>

              <button
                onClick={resetAndRegenerate}
                className="bg-gray-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-gray-700 transition-all"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-center text-sm text-gray-500">
          <p>This admin page is only available in development mode.</p>
          <p className="mt-1">Production builds will return 404.</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Server-side security check
 * Only allow access in development mode
 */
export async function getServerSideProps(context) {
  // Check if running in production
  if (process.env.NODE_ENV === 'production') {
    return {
      notFound: true, // Return 404 in production
    };
  }

  // Additional security: check for specific dev token if needed
  // Uncomment and set DEV_ADMIN_TOKEN in .env.local for extra security
  /*
  const adminToken = context.query.token;
  const validToken = process.env.DEV_ADMIN_TOKEN;

  if (!adminToken || adminToken !== validToken) {
    return {
      notFound: true,
    };
  }
  */

  return {
    props: {}, // Pass no props, page is self-contained
  };
}
