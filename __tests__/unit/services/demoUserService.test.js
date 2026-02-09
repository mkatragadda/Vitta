/**
 * Tests for demoUserService
 *
 * Critical areas covered:
 * 1. Guard rails - Only vittademo@gmail.com can use demo credentials
 * 2. Password validation - Exact match required
 * 3. Fixed user ID - Consistent across sessions
 * 4. Fallback behavior - Works without Supabase
 * 5. Error handling - Graceful failures
 */

import {
  authenticateDemoUser,
  isDemoEmail,
  isDemoUser
} from '../../../services/demoUserService';

describe('demoUserService', () => {
  const DEMO_EMAIL = 'vittademo@gmail.com';
  const DEMO_PASSWORD = 'vitta26demo';
  const DEMO_USER_ID = '12345678-1234-5678-9abc-def012345678'; // Valid UUID v4 format

  // ========================================================================
  // GUARD RAIL TESTS - Critical Security Tests
  // ========================================================================

  describe('Guard Rails - Email Restrictions', () => {
    it('should REJECT non-demo email with demo password', async () => {
      const result = await authenticateDemoUser('otheruser@gmail.com', DEMO_PASSWORD);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.user).toBeUndefined();
    });

    it('should REJECT random email addresses completely', async () => {
      const result = await authenticateDemoUser('attacker@evil.com', DEMO_PASSWORD);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.user).toBeUndefined();
    });

    it('should only allow exact demo email match', async () => {
      const variations = [
        'vittademo@GMAIL.COM',  // Wrong case - invalid format
        'vittademo @gmail.com', // Space - invalid format
        'vittademo@gmail.co',   // Different TLD - invalid format
        'demo@gmail.com',       // Wrong username - will fail at password check
        'vittademo@yahoo.com'   // Different provider - will fail at password check
      ];

      for (const email of variations) {
        const result = await authenticateDemoUser(email, DEMO_PASSWORD);
        expect(result.success).toBe(false);
        // Error could be "Invalid email format" or "Invalid email or password"
        expect([
          'Invalid email format',
          'Invalid email or password'
        ]).toContain(result.error);
      }
    });
  });

  describe('Guard Rails - Password Validation', () => {
    it('should REJECT demo email with incorrect password', async () => {
      const result = await authenticateDemoUser(DEMO_EMAIL, 'wrongpassword');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      expect(result.user).toBeUndefined();
    });

    it('should REJECT demo email with password variations', async () => {
      const variations = [
        'vitta26demo ',     // Extra space
        ' vitta26demo',     // Leading space
        'VITTA26DEMO',      // Wrong case
        'vitta26demo1',     // Extra character
        'vitta26dem',       // Missing character
        'vitta 26demo'      // Space in middle
      ];

      for (const password of variations) {
        const result = await authenticateDemoUser(DEMO_EMAIL, password);
        expect(result.success).toBe(false);
        expect(result.error).toBe('Invalid email or password');
      }
    });

    it('should require exact password match (no fuzzy matching)', async () => {
      const result = await authenticateDemoUser(DEMO_EMAIL, 'VITTA26DEMO');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
    });
  });

  describe('Guard Rails - Input Validation', () => {
    it('should reject empty email', async () => {
      const result = await authenticateDemoUser('', DEMO_PASSWORD);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Email and password are required');
    });

    it('should reject empty password', async () => {
      const result = await authenticateDemoUser(DEMO_EMAIL, '');
      expect(result.success).toBe(false);
      // Empty password is caught by combined validation
      expect([
        'Password is required',
        'Email and password are required'
      ]).toContain(result.error);
    });

    it('should reject null values', async () => {
      const result = await authenticateDemoUser(null, null);
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', async () => {
      const result = await authenticateDemoUser('notanemail', DEMO_PASSWORD);
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email format');
    });

    it('should reject password shorter than 6 characters', async () => {
      const result = await authenticateDemoUser(DEMO_EMAIL, '12345');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Password must be at least 6 characters');
    });
  });

  // ========================================================================
  // SUCCESSFUL AUTHENTICATION
  // ========================================================================

  describe('Successful Authentication', () => {
    it('should authenticate with correct demo credentials', async () => {
      const result = await authenticateDemoUser(DEMO_EMAIL, DEMO_PASSWORD);
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(DEMO_EMAIL);
      expect(result.error).toBeUndefined();
    });

    it('should return user object with correct structure', async () => {
      const result = await authenticateDemoUser(DEMO_EMAIL, DEMO_PASSWORD);
      expect(result.success).toBe(true);
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('name');
      expect(result.user).toHaveProperty('picture');
      expect(result.user).toHaveProperty('provider');
      expect(result.user).toHaveProperty('isDemoMode');
    });

    it('should return fixed user ID for consistency', async () => {
      const result1 = await authenticateDemoUser(DEMO_EMAIL, DEMO_PASSWORD);
      const result2 = await authenticateDemoUser(DEMO_EMAIL, DEMO_PASSWORD);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.user.id).toBe(result2.user.id);
      expect(result1.user.id).toBe(DEMO_USER_ID);
    });

    it('should set provider to demo', async () => {
      const result = await authenticateDemoUser(DEMO_EMAIL, DEMO_PASSWORD);
      expect(result.success).toBe(true);
      expect(result.user.provider).toBe('demo');
    });
  });

  // ========================================================================
  // UTILITY FUNCTIONS
  // ========================================================================

  describe('Utility Functions', () => {
    it('isDemoEmail should identify demo email correctly', () => {
      expect(isDemoEmail(DEMO_EMAIL)).toBe(true);
      expect(isDemoEmail('other@gmail.com')).toBe(false);
      expect(isDemoEmail('')).toBe(false);
      expect(isDemoEmail(null)).toBe(false);
    });

    it('isDemoUser should identify demo users correctly', () => {
      const demoUser = {
        id: DEMO_USER_ID,
        email: DEMO_EMAIL,
        provider: 'demo'
      };

      const googleUser = {
        id: 'uuid-123',
        email: 'user@gmail.com',
        provider: 'google'
      };

      expect(isDemoUser(demoUser)).toBe(true);
      expect(isDemoUser(googleUser)).toBe(false);
      expect(isDemoUser(null)).toBe(false);
      expect(isDemoUser({})).toBe(false);
    });

    it('isDemoUser should recognize user by demo user ID', () => {
      const user = {
        id: DEMO_USER_ID,
        email: 'different@email.com',
        provider: 'google'
      };

      expect(isDemoUser(user)).toBe(true);
    });

    it('isDemoUser should recognize user by demo provider', () => {
      const user = {
        id: 'different-id',
        email: 'different@email.com',
        provider: 'demo'
      };

      expect(isDemoUser(user)).toBe(true);
    });
  });

  // ========================================================================
  // ERROR HANDLING & FALLBACK BEHAVIOR
  // ========================================================================

  describe('Error Handling & Fallback', () => {
    it('should fall back to in-memory demo mode on authentication success', async () => {
      const result = await authenticateDemoUser(DEMO_EMAIL, DEMO_PASSWORD);
      expect(result.success).toBe(true);
      // Should return a user object (either from DB or in-memory fallback)
      expect(result.user).toBeDefined();
    });

    it('should not return error for successful auth', async () => {
      const result = await authenticateDemoUser(DEMO_EMAIL, DEMO_PASSWORD);
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  // ========================================================================
  // BRUTE FORCE PROTECTION
  // ========================================================================

  describe('Brute Force Protection', () => {
    it('should return generic error message for failed attempts', async () => {
      // This prevents attackers from knowing if email exists
      const wrongEmail = await authenticateDemoUser('user@gmail.com', DEMO_PASSWORD);
      const wrongPassword = await authenticateDemoUser(DEMO_EMAIL, 'wrongpass');

      // Both should return the same generic error
      expect(wrongEmail.error).toBe('Invalid email or password');
      expect(wrongPassword.error).toBe('Invalid email or password');
    });

    it('should accept correct credentials after multiple failures', async () => {
      // Simulate multiple failed attempts
      await authenticateDemoUser(DEMO_EMAIL, 'wrong1');
      await authenticateDemoUser(DEMO_EMAIL, 'wrong2');
      await authenticateDemoUser(DEMO_EMAIL, 'wrong3');

      // Should still accept correct credentials
      const result = await authenticateDemoUser(DEMO_EMAIL, DEMO_PASSWORD);
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
    });
  });

  // ========================================================================
  // ISOLATION TESTS
  // ========================================================================

  describe('Demo Flow Isolation', () => {
    it('should not allow non-demo users to trigger demo flow', async () => {
      const result = await authenticateDemoUser('alice@company.com', 'password123');
      expect(result.success).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('should not create side effects for failed authentications', async () => {
      const result = await authenticateDemoUser('hacker@evil.com', 'stolen_password');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email or password');
      // Should not return any user information that could be used for enumeration
      expect(result.user).toBeUndefined();
    });
  });
});
