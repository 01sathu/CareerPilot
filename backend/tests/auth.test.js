const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');

describe('Module A: Authentication & User Management Integration Tests', () => {
  const testUser = {
    name: 'Jane Doe',
    email: 'jane.doe@test.com',
    password: 'Password123',
    passwordConfirmation: 'Password123'
  };

  let testAccessToken = '';
  let testRefreshToken = '';

  // 1. Registration Tests
  describe('POST /api/v1/auth/register', () => {
    it('successfully registers a user and returns tokens (FR-001, FR-005, FR-009, FR-010)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send(testUser);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.name).toBe(testUser.name);
      expect(res.body.data.user.passwordHash).toBeUndefined(); // FR-004: Never return passwordHash
      expect(res.body.data.accessToken).toBeDefined();

      // Check HttpOnly refresh token cookie
      const cookies = res.headers['set-cookie'];
      expect(cookies).toBeDefined();
      expect(cookies.some((c) => c.includes('refreshToken='))).toBe(true);
      expect(cookies.some((c) => c.includes('HttpOnly'))).toBe(true);

      // Verify password stored as bcrypt hash in DB
      const dbUser = await User.findOne({ email: testUser.email }).select('+passwordHash');
      expect(dbUser).toBeDefined();
      expect(dbUser.passwordHash).not.toBe(testUser.password);
      expect(dbUser.passwordHash.startsWith('$2')).toBe(true);
    });

    it('rejects duplicate email with 409 EMAIL_ALREADY_REGISTERED (FR-002)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          ...testUser,
          email: 'JANE.DOE@test.com' // case-insensitive check
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('EMAIL_ALREADY_REGISTERED');
    });

    it('rejects registration with invalid password failing complexity (FR-003)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Invalid User',
          email: 'invalid.pwd@test.com',
          password: 'simplepassword', // missing uppercase and digit
          passwordConfirmation: 'simplepassword'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details.some((d) => d.field === 'password')).toBe(true);
    });

    it('rejects registration when password confirmation does not match', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Mismatch User',
          email: 'mismatch@test.com',
          password: 'Password123',
          passwordConfirmation: 'Mismatch123'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // 2. Login Tests
  describe('POST /api/v1/auth/login', () => {
    it('successfully logs in with valid credentials (FR-006)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());

      testAccessToken = res.body.data.accessToken;

      const cookies = res.headers['set-cookie'];
      const refreshCookie = cookies.find((c) => c.startsWith('refreshToken='));
      testRefreshToken = refreshCookie.split(';')[0].split('=')[1];
      expect(testRefreshToken).toBeDefined();
    });

    it('returns generic 401 on incorrect password (FR-007)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'WrongPassword999'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });

    it('returns identical generic 401 on non-existent email (FR-007)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'nonexistent.user@test.com',
          password: 'Password123'
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(res.body.error.message).toBe('Invalid email or password');
    });
  });

  // 3. Protected Route & Auth Middleware Tests (FR-013, FR-149, FR-150)
  describe('Protected Routes & Authorization Middleware', () => {
    it('rejects access without access token (401 UNAUTHORIZED)', async () => {
      const res = await request(app).get('/api/v1/users/me');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects access with invalid access token (401 INVALID_TOKEN)', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', 'Bearer invalid.jwt.token.string');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_TOKEN');
    });

    it('allows access with valid access token and returns user profile (FR-017)', async () => {
      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Authorization', `Bearer ${testAccessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(testUser.email.toLowerCase());
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('updates user profile with skill deduplication and validation (FR-018, FR-019)', async () => {
      const updateData = {
        headline: 'Senior Full-Stack Engineer',
        experienceLevel: 'senior',
        skills: ['React', 'react', 'Node.js', 'MongoDB', 'REACT'],
        targetRoles: ['Full Stack Developer', 'Software Engineer'],
        timezone: 'Asia/Kolkata',
        openToRemote: true,
        aiConsent: true
      };

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send(updateData);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.headline).toBe('Senior Full-Stack Engineer');
      expect(res.body.data.user.experienceLevel).toBe('senior');
      // Skills should be trimmed and deduplicated case-insensitively
      expect(res.body.data.user.skills).toEqual(['React', 'Node.js', 'MongoDB']);
      expect(res.body.data.user.aiConsentAcceptedAt).toBeDefined();
    });
  });

  // 4. Token Refresh & Rotation Tests (FR-010)
  describe('POST /api/v1/auth/refresh (Rotation & Reuse Detection)', () => {
    let secondRefreshToken = '';

    it('rotates refresh token and issues new access token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${testRefreshToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();

      const cookies = res.headers['set-cookie'];
      const newCookie = cookies.find((c) => c.startsWith('refreshToken='));
      secondRefreshToken = newCookie.split(';')[0].split('=')[1];
      expect(secondRefreshToken).toBeDefined();
      expect(secondRefreshToken).not.toBe(testRefreshToken);
    });

    it('detects token reuse and revokes all user sessions (FR-010)', async () => {
      // Attempting to reuse testRefreshToken, which was already rotated
      const reuseRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${testRefreshToken}`]);

      expect(reuseRes.status).toBe(401);
      expect(reuseRes.body.success).toBe(false);
      expect(reuseRes.body.error.code).toBe('TOKEN_REUSE_DETECTED');

      // Now verify that even secondRefreshToken has been revoked
      const invalidRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${secondRefreshToken}`]);

      expect(invalidRes.status).toBe(401);
    });
  });

  // 5. Password Reset Flow (FR-014, FR-015)
  describe('Password Reset Flow', () => {
    it('forgot-password returns generic success response (FR-014)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/forgot-password')
        .send({ email: testUser.email });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message).toBeDefined();
    });

    it('resets password successfully using generated reset token', async () => {
      const user = await User.findOne({ email: testUser.email }).select('+passwordResetTokenHash +passwordResetExpires');
      const resetToken = user.createPasswordResetToken();
      await user.save();

      const newPassword = 'NewSecretPassword456';
      const resetRes = await request(app)
        .post(`/api/v1/auth/reset-password?token=${resetToken}`)
        .send({
          password: newPassword,
          passwordConfirmation: newPassword
        });

      expect(resetRes.status).toBe(200);
      expect(resetRes.body.success).toBe(true);

      // Verify login works with new password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: newPassword
        });

      expect(loginRes.status).toBe(200);
      expect(loginRes.body.data.accessToken).toBeDefined();

      // Update test user's current token for subsequent tests
      testAccessToken = loginRes.body.data.accessToken;
    });
  });

  // 6. Password Change (FR-116)
  describe('POST /api/v1/auth/change-password', () => {
    it('changes password when authenticated and revokes other tokens', async () => {
      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          currentPassword: 'NewSecretPassword456',
          newPassword: 'UpdatedPassword789',
          newPasswordConfirmation: 'UpdatedPassword789'
        });

      expect(changeRes.status).toBe(200);
      expect(changeRes.body.success).toBe(true);
      expect(changeRes.body.data.accessToken).toBeDefined();

      // Verify login works with the updated password
      const loginRes = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: testUser.email,
          password: 'UpdatedPassword789'
        });

      expect(loginRes.status).toBe(200);
      testAccessToken = loginRes.body.data.accessToken;
      const cookies = loginRes.headers['set-cookie'];
      testRefreshToken = cookies.find((c) => c.startsWith('refreshToken=')).split(';')[0].split('=')[1];
    });

    it('rejects password change if current password is incorrect', async () => {
      const changeRes = await request(app)
        .post('/api/v1/auth/change-password')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .send({
          currentPassword: 'IncorrectOldPassword',
          newPassword: 'AnotherPassword123',
          newPasswordConfirmation: 'AnotherPassword123'
        });

      expect(changeRes.status).toBe(400);
      expect(changeRes.body.error.code).toBe('INVALID_CURRENT_PASSWORD');
    });
  });

  // 7. Logout (FR-011)
  describe('POST /api/v1/auth/logout', () => {
    it('logs out and revokes refresh token cookie', async () => {
      const logoutRes = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${testAccessToken}`)
        .set('Cookie', [`refreshToken=${testRefreshToken}`]);

      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body.success).toBe(true);

      // Verify refresh cookie cleared
      const cookies = logoutRes.headers['set-cookie'];
      expect(cookies.some((c) => c.includes('refreshToken=;') || c.includes('Max-Age=0'))).toBe(true);

      // Verify refresh token no longer works
      const refreshRes = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', [`refreshToken=${testRefreshToken}`]);

      expect(refreshRes.status).toBe(401);
    });
  });
});
