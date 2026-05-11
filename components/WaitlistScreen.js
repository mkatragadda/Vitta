import React from 'react';
import { LogOut, Mail, Calendar, CheckCircle } from 'lucide-react';

/**
 * WaitlistScreen - Shown to users who have signed up but are not yet approved
 *
 * @param {Object} props
 * @param {Object} props.user - User object with email, name, waitlistJoinedAt
 * @param {Function} props.onSignOut - Sign out handler
 */
const WaitlistScreen = ({ user, onSignOut }) => {
  // Format join date
  const joinedDate = user?.waitlistJoinedAt
    ? new Date(user.waitlistJoinedAt).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });

  return (
    <div className="min-h-screen min-h-dvh bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center px-4 py-8 safe-area-inset">
      {/* Background decorative elements - hidden on mobile */}
      <div className="hidden lg:block absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-40 right-10 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-6 lg:p-10 max-w-md w-full text-center border border-white/20">

        {/* Logo */}
        <div className="w-16 h-16 lg:w-20 lg:h-20 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
          <span className="text-white font-bold text-2xl lg:text-3xl">V</span>
        </div>

        {/* Main Heading */}
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-3">
            🎉 You&apos;re on the Waitlist!
          </h1>
          <p className="text-gray-600 text-base lg:text-lg">
            Thanks for signing up with
          </p>
          <p className="font-semibold text-blue-600 text-base lg:text-lg mt-1">
            {user?.email || 'your account'}
          </p>
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-5 mb-6 text-left shadow-sm">
          <div className="flex items-start gap-3 mb-3">
            <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-gray-700 leading-relaxed text-sm lg:text-base">
              We&apos;re gradually onboarding users to ensure the best experience.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-gray-700 leading-relaxed text-sm lg:text-base">
              You&apos;ll receive an email when your access is approved.
            </p>
          </div>
        </div>

        {/* Status Info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-3 border border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="w-4 h-4" />
              <span className="text-sm font-medium">Joined:</span>
            </div>
            <span className="font-semibold text-gray-900 text-sm">{joinedDate}</span>
          </div>
          <div className="h-px bg-gray-200"></div>
          <div className="flex items-center justify-between">
            <span className="text-gray-600 text-sm font-medium">Status:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
              <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
              Pending Approval
            </span>
          </div>
        </div>

        {/* User Info (if name available) */}
        {user?.name && (
          <div className="mb-6 text-sm text-gray-600">
            Signed in as <span className="font-medium text-gray-900">{user.name}</span>
          </div>
        )}

        {/* Sign Out Button */}
        <button
          onClick={onSignOut}
          className="flex items-center justify-center gap-2 w-full px-4 py-3 text-gray-700 bg-white hover:bg-gray-50 hover:text-gray-900 rounded-xl transition-all border-2 border-gray-200 hover:border-gray-300 font-medium shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 leading-relaxed">
            Questions about your waitlist status?
            <br />
            Contact us at{' '}
            <a
              href="mailto:support@getvitta.com"
              className="text-blue-600 hover:text-blue-700 underline font-medium"
            >
              support@getvitta.com
            </a>
          </p>
        </div>
      </div>

      {/* Trust Indicators */}
      <div className="absolute bottom-6 left-0 right-0 text-center text-sm text-blue-100 px-4">
        <p>🔒 Secure • 🏦 Encrypted • 💳 Privacy-First</p>
      </div>
    </div>
  );
};

export default WaitlistScreen;
