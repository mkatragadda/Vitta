# Google OAuth Setup for Vitta

## Overview
This guide explains how to set up Google OAuth authentication for the Vitta login screen.

## Demo Mode
The application currently works in demo mode with placeholder client ID. For full functionality, you'll need to set up a Google Cloud project.

## Google Cloud Console Setup

### 1. Create a Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the "Google Identity" API

### 2. Configure OAuth Consent Screen
1. Navigate to "APIs & Services" > "OAuth consent screen"
2. Choose "External" for user type
3. Fill in required details:
   - App name: "Vitta"
   - User support email: your email
   - Developer contact information: your email
4. Add authorized domains (for production):
   - `localhost` (for development)
   - Your production domain

### 3. Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Add authorized JavaScript origins (ADD ALL OF THESE):
   - `http://localhost:3000`
   - `http://127.0.0.1:3000`
   - `http://localhost:3001`
   - `http://127.0.0.1:3001`
   - `http://localhost:3002`
   - `http://127.0.0.1:3002`
   - Your production URL (when ready)
5. Copy the generated Client ID

### 4. Environment Configuration
1. Create a `.env.local` file in the project root
2. Add your Google Client ID:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_actual_google_client_id_here.apps.googleusercontent.com
   ```

## Mobile Responsiveness Features

### 1. Responsive Design
- Google OAuth button adapts to mobile screen sizes
- Touch-friendly button dimensions (minimum 44px height)
- Proper spacing and padding for mobile devices

### 2. Mobile-First Implementation
- Uses modern Google Identity Services (GSI)
- Works seamlessly on iOS and Android browsers
- Supports both popup and redirect flows

### 3. Accessibility
- Proper focus management for keyboard navigation
- Screen reader compatible
- High contrast color scheme

## Testing

### Development Testing
1. Start the development server: `npm run dev`
2. Open `http://localhost:3000`
3. Click "Continue with Google"
4. In demo mode, this will show a popup (requires actual Client ID for full functionality)

### Mobile Testing
1. Test on various devices (phone, tablet)
2. Verify button responsiveness
3. Test OAuth flow on different mobile browsers
4. Ensure proper touch interactions

## Troubleshooting

### Common Issues
1. **"The given origin is not allowed for the given client ID"**:
   - This is the most common error. You must add ALL development origins to Google Console:
   - Go to Google Cloud Console > APIs & Services > Credentials
   - Edit your OAuth 2.0 Client ID
   - In "Authorized JavaScript origins", add:
     - `http://localhost:3000`
     - `http://127.0.0.1:3000`
     - `http://localhost:3001`
     - `http://127.0.0.1:3001`
     - `http://localhost:3002`
     - `http://127.0.0.1:3002`
   - Save changes and wait 5-10 minutes for Google to propagate the changes

2. **"Invalid Client ID"**: Ensure your Client ID is properly set in environment variables

3. **"Redirect URI mismatch"**: Add your domain to authorized origins in Google Console

4. **Mobile popup issues**: Some mobile browsers block popups; the implementation handles this gracefully

5. **Changes not taking effect**: Google OAuth changes can take 5-10 minutes to propagate. Clear browser cache and try again.

### Demo Mode Features
- Works without Google Cloud setup
- Fallback to email/password authentication
- Shows OAuth button design and layout
- Maintains consistent mobile experience

## Security Notes
- Client ID is safe to expose in frontend code
- Never expose Client Secret in frontend applications
- Use HTTPS in production
- Validate tokens on your backend for production use

## Next Steps
1. Set up actual Google Cloud project
2. Configure production domains
3. Implement backend token validation
4. Add proper error handling for various OAuth scenarios

