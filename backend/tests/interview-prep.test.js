const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Application = require('../src/models/Application');
const Resume = require('../src/models/Resume');
const InterviewSession = require('../src/models/InterviewSession');
const aiService = require('../src/services/ai.service');
const { resetAiRateLimits } = require('../src/middleware/aiRateLimiter.middleware');

describe('Module D: AI Interview Preparation Integration Tests (FR-068 to FR-079, AC-D-01 to AC-D-05)', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';
  let testAppId = '';

  const mockGeneratedQuestions = [
    {
      type: 'technical',
      questionText: 'Explain the event loop in Node.js and how microtasks differ from macrotasks.',
      difficulty: 'medium',
      focusTopic: 'Node.js Architecture'
    },
    {
      type: 'technical',
      questionText: 'How do you optimize React re-renders when passing callbacks to child components?',
      difficulty: 'medium',
      focusTopic: 'React Performance'
    },
    {
      type: 'behavioral',
      questionText: 'Describe a situation where you had a disagreement with a team member about technical architecture. How did you resolve it?',
      difficulty: 'medium',
      focusTopic: 'Conflict Resolution'
    },
    {
      type: 'behavioral',
      questionText: 'Tell me about a high-pressure production incident you resolved.',
      difficulty: 'hard',
      focusTopic: 'Incident Management'
    },
    {
      type: 'hr',
      questionText: 'Why are you interested in this role and what are your long-term career aspirations?',
      difficulty: 'easy',
      focusTopic: 'Career Goals'
    }
  ];

  beforeAll(async () => {
    // 1. Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Prep User A',
        email: 'prep.a@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userAToken = resA.body.data.accessToken;
    userAId = resA.body.data.user._id;

    // 2. Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Prep User B',
        email: 'prep.b@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userBToken = resB.body.data.accessToken;
    userBId = resB.body.data.user._id;

    // Grant AI consent to User A
    await request(app)
      .post('/api/v1/users/ai-consent')
      .set('Authorization', `Bearer ${userAToken}`);

    // Create an application for User A to test tailoring
    const appRes = await request(app)
      .post('/api/v1/applications')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        companyName: 'Acme Prep Corp',
        jobTitle: 'Senior Full Stack Engineer',
        status: 'applied',
        jobDescription: 'Seeking expert in Node.js, React, and distributed systems.'
      });
    testAppId = appRes.body.data.application._id;
  });

  afterAll(async () => {
    await InterviewSession.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Application.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Resume.deleteMany({ userId: { $in: [userAId, userBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
  });

  beforeEach(() => {
    resetAiRateLimits();
  });

  // 1. AI Consent & Quota Enforcement (FR-063, FR-064)
  describe('AI Consent & Rate Limiting (FR-063, FR-064)', () => {
    it('rejects question generation with 403 AI_CONSENT_REQUIRED when user has not accepted consent (FR-063, AC-C-06)', async () => {
      // User B has not accepted consent
      const res = await request(app)
        .post('/api/v1/interview-sessions')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          roleTitle: 'Frontend Engineer',
          experienceLevel: 'junior',
          questionTypes: ['technical'],
          count: 5
        });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AI_CONSENT_REQUIRED');
    });

    it('enforces 20 interview AI requests per hour rate limit (FR-064)', async () => {
      vi.spyOn(aiService, 'generateInterviewQuestions').mockResolvedValue({
        questions: mockGeneratedQuestions
      });

      // Simulate 20 requests
      for (let i = 0; i < 20; i++) {
        const res = await request(app)
          .post('/api/v1/interview-sessions')
          .set('Authorization', `Bearer ${userAToken}`)
          .send({
            roleTitle: 'Frontend Engineer',
            experienceLevel: 'mid',
            questionTypes: ['technical'],
            count: 5
          });
        expect(res.status).toBe(201);
      }

      // 21st attempt should be rejected with 429
      const res21 = await request(app)
        .post('/api/v1/interview-sessions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          roleTitle: 'Frontend Engineer',
          experienceLevel: 'mid',
          questionTypes: ['technical'],
          count: 5
        });

      expect(res21.status).toBe(429);
      expect(res21.body.error.code).toBe('AI_RATE_LIMIT_EXCEEDED');
      expect(res21.headers['retry-after']).toBeDefined();
    });
  });

  // 2. Question Generation & Session Creation (FR-068 to FR-070, AC-D-01)
  describe('POST /api/v1/interview-sessions (Question Generation, AC-D-01)', () => {
    let createdSessionId = '';

    it('generates interview questions and creates a practice session (FR-068, FR-069, FR-070, AC-D-01)', async () => {
      vi.spyOn(aiService, 'generateInterviewQuestions').mockResolvedValueOnce({
        questions: mockGeneratedQuestions
      });

      const res = await request(app)
        .post('/api/v1/interview-sessions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          roleTitle: 'Full Stack Engineer',
          experienceLevel: 'senior',
          questionTypes: ['technical', 'behavioral', 'hr'],
          count: 5,
          mode: 'practice',
          applicationId: testAppId
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.session).toHaveProperty('_id');
      expect(res.body.data.session.roleTitle).toBe('Full Stack Engineer');
      expect(res.body.data.session.mode).toBe('practice');
      expect(res.body.data.session.status).toBe('in_progress');
      expect(res.body.data.session.questions).toHaveLength(5);
      expect(res.body.data.session.questions[0]).toHaveProperty('type');
      expect(res.body.data.session.questions[0]).toHaveProperty('questionText');
      expect(res.body.data.session.questions[0]).toHaveProperty('difficulty');

      createdSessionId = res.body.data.session._id;
    });

    it('rejects cross-tenant application linking with 404 (FR-149, FR-091)', async () => {
      // User B tries to link User A's application
      await request(app)
        .post('/api/v1/users/ai-consent')
        .set('Authorization', `Bearer ${userBToken}`);

      const res = await request(app)
        .post('/api/v1/interview-sessions')
        .set('Authorization', `Bearer ${userBToken}`)
        .send({
          roleTitle: 'Full Stack Engineer',
          experienceLevel: 'mid',
          questionTypes: ['technical'],
          count: 5,
          applicationId: testAppId
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('APPLICATION_NOT_FOUND');
    });

    it('validates question count constraint (5-15) and required role title (FR-068)', async () => {
      const res = await request(app)
        .post('/api/v1/interview-sessions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          roleTitle: '',
          experienceLevel: 'mid',
          questionTypes: ['technical'],
          count: 2
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // 3. Answer Persistence & Sample Answers (FR-071, FR-072, AC-D-02)
  describe('Answer Management & Sample Answers (FR-071, FR-072, AC-D-02)', () => {
    let sessionId = '';
    let questionId = '';

    beforeEach(async () => {
      vi.spyOn(aiService, 'generateInterviewQuestions').mockResolvedValueOnce({
        questions: mockGeneratedQuestions
      });

      const res = await request(app)
        .post('/api/v1/interview-sessions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          roleTitle: 'Backend Engineer',
          experienceLevel: 'mid',
          questionTypes: ['technical'],
          count: 5
        });

      sessionId = res.body.data.session._id;
      questionId = res.body.data.session.questions[0]._id;
    });

    it('saves, edits, and persists user answer across reloads (FR-072, AC-D-02)', async () => {
      const myAnswer =
        'The event loop in Node.js processes asynchronous operations through phases like timers, pending callbacks, poll, check, and close callbacks. Microtasks run immediately after each phase.';

      // Save answer
      const patchRes = await request(app)
        .patch(`/api/v1/interview-sessions/${sessionId}/questions/${questionId}/answer`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          userAnswer: myAnswer,
          revisit: true
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.question.userAnswer).toBe(myAnswer);
      expect(patchRes.body.data.question.revisit).toBe(true);

      // Verify persistence via GET /api/v1/interview-sessions/:id
      const getRes = await request(app)
        .get(`/api/v1/interview-sessions/${sessionId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(getRes.status).toBe(200);
      const savedQ = getRes.body.data.session.questions.find((q) => q._id === questionId);
      expect(savedQ.userAnswer).toBe(myAnswer);
      expect(savedQ.revisit).toBe(true);
    });

    it('generates and caches AI sample answer (FR-071)', async () => {
      vi.spyOn(aiService, 'generateExampleAnswer').mockResolvedValueOnce({
        exampleAnswer: 'A high quality sample answer demonstrating how the Node.js event loop operates.'
      });

      const res = await request(app)
        .post(`/api/v1/interview-sessions/${sessionId}/questions/${questionId}/example-answer`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.isSample).toBe(true);
      expect(res.body.data.exampleAnswer).toContain('event loop operates');

      // Second request should return cached answer without calling LLM
      const spy = vi.spyOn(aiService, 'generateExampleAnswer');
      const cachedRes = await request(app)
        .post(`/api/v1/interview-sessions/${sessionId}/questions/${questionId}/example-answer`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(cachedRes.status).toBe(200);
      expect(cachedRes.body.data.exampleAnswer).toBe(res.body.data.exampleAnswer);
      expect(spy).not.toHaveBeenCalled();
    });
  });

  // 4. Structured AI Answer Evaluation (FR-074, FR-075, AC-D-04)
  describe('Answer Evaluation & Feedback (FR-074, FR-075, AC-D-04)', () => {
    let sessionId = '';
    let questionId = '';

    beforeEach(async () => {
      vi.spyOn(aiService, 'generateInterviewQuestions').mockResolvedValueOnce({
        questions: mockGeneratedQuestions
      });

      const res = await request(app)
        .post('/api/v1/interview-sessions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          roleTitle: 'Backend Engineer',
          experienceLevel: 'mid',
          questionTypes: ['technical'],
          count: 5
        });

      sessionId = res.body.data.session._id;
      questionId = res.body.data.session.questions[0]._id;
    });

    it('rejects answers shorter than 20 characters without calling LLM (FR-075, AC-D-04)', async () => {
      const spy = vi.spyOn(aiService, 'evaluateInterviewAnswer');

      const res = await request(app)
        .post(`/api/v1/interview-sessions/${sessionId}/questions/${questionId}/feedback`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          userAnswer: 'Too short'
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(spy).not.toHaveBeenCalled();
    });

    it('evaluates answers with 1-5 ratings across 4 criteria, summary, and strengths/improvements (FR-074, AC-D-04)', async () => {
      vi.spyOn(aiService, 'evaluateInterviewAnswer').mockResolvedValueOnce({
        summary: 'Solid understanding of Node.js event loop with clear differentiation of phases.',
        strengths: ['Accurate explanation of microtasks', 'Clear technical vocabulary'],
        areasToImprove: ['Could mention setImmediate vs process.nextTick priority'],
        ratings: {
          relevance: 5,
          structure: 4,
          clarity: 4,
          specificity: 4
        }
      });

      const detailedAnswer =
        'In Node.js, the event loop coordinates execution between V8 and libuv. Timers are processed first, then poll for I/O, check phase handles setImmediate, and microtasks run after every phase.';

      const res = await request(app)
        .post(`/api/v1/interview-sessions/${sessionId}/questions/${questionId}/feedback`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          userAnswer: detailedAnswer
        });

      expect(res.status).toBe(200);
      expect(res.body.data.feedback.ratings.relevance).toBe(5);
      expect(res.body.data.feedback.ratings.structure).toBe(4);
      expect(res.body.data.feedback.ratings.clarity).toBe(4);
      expect(res.body.data.feedback.ratings.specificity).toBe(4);
      expect(res.body.data.feedback.strengths).toHaveLength(2);
      expect(res.body.data.feedback.areasToImprove).toHaveLength(1);
    });
  });

  // 5. Mock Interview Simulation & Summary (FR-073, FR-077, AC-D-03)
  describe('Mock Interview Session Flow (FR-073, FR-077, AC-D-03)', () => {
    let mockSessionId = '';

    beforeEach(async () => {
      vi.spyOn(aiService, 'generateInterviewQuestions').mockResolvedValueOnce({
        questions: mockGeneratedQuestions
      });

      const res = await request(app)
        .post('/api/v1/interview-sessions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          roleTitle: 'Full Stack Engineer',
          experienceLevel: 'mid',
          questionTypes: ['technical', 'behavioral'],
          count: 5,
          mode: 'mock'
        });

      mockSessionId = res.body.data.session._id;
    });

    it('allows skipping questions, saving answers, and pausing at correct question index (FR-073, AC-D-03)', async () => {
      const session = await InterviewSession.findById(mockSessionId);

      // Question 0: Answered
      await request(app)
        .patch(`/api/v1/interview-sessions/${mockSessionId}/questions/${session.questions[0]._id}/answer`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          userAnswer: 'This is my comprehensive answer to the first question in the mock interview.',
          currentQuestionIndex: 1
        });

      // Question 1: Skipped
      await request(app)
        .patch(`/api/v1/interview-sessions/${mockSessionId}/questions/${session.questions[1]._id}/answer`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          isSkipped: true,
          currentQuestionIndex: 2
        });

      // Pause and resume check
      const getRes = await request(app)
        .get(`/api/v1/interview-sessions/${mockSessionId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.data.session.currentQuestionIndex).toBe(2);
      expect(getRes.body.data.session.questions[1].isSkipped).toBe(true);
    });

    it('completes mock session and generates summary with answered/skipped counts and averages (FR-077, AC-D-03)', async () => {
      const session = await InterviewSession.findById(mockSessionId);

      // Set up question 0 with answer and feedback
      session.questions[0].userAnswer = 'Detailed answer to question zero.';
      session.questions[0].feedback = {
        summary: 'Good',
        ratings: { relevance: 5, structure: 4, clarity: 4, specificity: 3 }
      };

      // Set up question 1 as skipped
      session.questions[1].isSkipped = true;

      // Set up question 2 with revisit bookmark
      session.questions[2].revisit = true;

      await session.save();

      // Complete session
      const completeRes = await request(app)
        .post(`/api/v1/interview-sessions/${mockSessionId}/complete`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(completeRes.status).toBe(200);
      expect(completeRes.body.data.session.status).toBe('completed');
      expect(completeRes.body.data.session.summary.totalQuestions).toBe(5);
      expect(completeRes.body.data.session.summary.answeredCount).toBe(1);
      expect(completeRes.body.data.session.summary.skippedCount).toBe(1);
      expect(completeRes.body.data.session.summary.revisitCount).toBe(1);
      expect(completeRes.body.data.session.summary.averageRatings.relevance).toBe(5);
      expect(completeRes.body.data.session.summary.averageRatings.overall).toBe(4);
    });
  });

  // 6. Multi-Tenancy & Session Deletion (FR-078, FR-149, AC-D-05)
  describe('Session Listing, Multi-Tenancy Isolation & Deletion (FR-078, FR-149, AC-D-05)', () => {
    let sessionAId = '';

    beforeEach(async () => {
      vi.spyOn(aiService, 'generateInterviewQuestions').mockResolvedValueOnce({
        questions: mockGeneratedQuestions
      });

      const res = await request(app)
        .post('/api/v1/interview-sessions')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          roleTitle: 'Software Architect',
          experienceLevel: 'lead',
          questionTypes: ['technical'],
          count: 5
        });

      sessionAId = res.body.data.session._id;
    });

    it('lists user sessions with pagination and question counts (FR-078)', async () => {
      const res = await request(app)
        .get('/api/v1/interview-sessions?limit=5')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.sessions)).toBe(true);
      expect(res.body.data.sessions[0]).toHaveProperty('questionCount');
    });

    it('enforces multi-tenancy: returns 404 when User B attempts to access User A session (FR-149, AC-D-05)', async () => {
      const res = await request(app)
        .get(`/api/v1/interview-sessions/${sessionAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('enforces multi-tenancy: returns 404 when User B attempts to delete User A session (FR-149, AC-D-05)', async () => {
      const res = await request(app)
        .delete(`/api/v1/interview-sessions/${sessionAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('allows owner to delete session successfully (FR-078)', async () => {
      const delRes = await request(app)
        .delete(`/api/v1/interview-sessions/${sessionAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(delRes.status).toBe(200);

      const checkRes = await request(app)
        .get(`/api/v1/interview-sessions/${sessionAId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(checkRes.status).toBe(404);
    });
  });
});
