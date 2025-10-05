// OAuth Configuration for Vitta
// For production, replace with your actual Google OAuth Client ID
// Get this from: https://console.developers.google.com/

export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'demo_client_id_for_testing';

// OAuth configuration options
export const OAUTH_CONFIG = {
  client_id: GOOGLE_CLIENT_ID,
  callback: handleGoogleSignIn,
  auto_select: false,
  cancel_on_tap_outside: true
};

// Placeholder function - will be implemented in the component
function handleGoogleSignIn(response) {
  console.log('Google Sign-In response:', response);
}

