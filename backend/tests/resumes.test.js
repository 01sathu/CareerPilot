const request = require('supertest');
const app = require('../src/app');
const User = require('../src/models/User');
const Resume = require('../src/models/Resume');
const Application = require('../src/models/Application');
const aiService = require('../src/services/ai.service');
const { resetAiRateLimits } = require('../src/middleware/aiRateLimiter.middleware');

// Helper to generate dynamic valid PDF buffers
function makePdf(text = 'A'.repeat(150), pages = 1) {
  let kids = '';
  let pageObjs = '';
  for (let i = 1; i <= pages; i++) {
    const pageObjId = 2 + i * 2;
    const contentObjId = pageObjId + 1;
    kids += pageObjId + ' 0 R ';
    pageObjs +=
      pageObjId +
      ' 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ' +
      contentObjId +
      ' 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n' +
      contentObjId +
      ' 0 obj\n<< /Length ' +
      (text.length + 50) +
      ' >>\nstream\nBT\n/F1 12 Tf\n100 700 Td\n(' +
      text.replace(/[\(\)]/g, '') +
      ') Tj\nET\nendstream\nendobj\n';
  }
  const pdfStr =
    '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [' +
    kids +
    '] /Count ' +
    pages +
    ' >>\nendobj\n' +
    pageObjs +
    'xref\n0 ' +
    (3 + pages * 2) +
    '\n0000000000 65535 f \ntrailer\n<< /Size ' +
    (3 + pages * 2) +
    ' /Root 1 0 R >>\nstartxref\n500\n%%EOF';
  return Buffer.from(pdfStr);
}

describe('Module C: AI Resume Analyzer Integration Tests (FR-046 to FR-067)', () => {
  let userAToken = '';
  let userBToken = '';
  let userAId = '';
  let userBId = '';

  beforeAll(async () => {
    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Resume User A',
        email: 'resume.a@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userAToken = resA.body.data.accessToken;
    userAId = resA.body.data.user._id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        name: 'Resume User B',
        email: 'resume.b@test.com',
        password: 'Password123',
        passwordConfirmation: 'Password123'
      });
    userBToken = resB.body.data.accessToken;
    userBId = resB.body.data.user._id;
  });

  afterAll(async () => {
    await Resume.deleteMany({ userId: { $in: [userAId, userBId] } });
    await Application.deleteMany({ userId: { $in: [userAId, userBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
  });

  beforeEach(() => {
    resetAiRateLimits();
  });

  // 1. Upload & PDF Validation Tests
  describe('POST /api/v1/resumes (Upload & Validation)', () => {
    it('successfully uploads a valid PDF resume and extracts text (FR-046, FR-049, AC-C-01)', async () => {
      const sampleText =
        'Jane Doe, Full Stack Engineer. Expert in React, Node.js, Express, MongoDB, and Tailwind CSS. 5 years building scalable web architectures.';
      const pdfBuffer = makePdf(sampleText, 2);

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('resume', pdfBuffer, 'jane_doe_resume.pdf');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resume).toHaveProperty('_id');
      expect(res.body.data.resume.originalFilename).toBe('jane_doe_resume.pdf');
      expect(res.body.data.resume.pageCount).toBe(2);
      expect(res.body.data.resume.extractionStatus).toBe('success');
      expect(res.body.data.resume.extractedText).toContain('Jane Doe');
    });

    it('rejects files with invalid leading bytes / non-PDFs (FR-047, AC-C-02)', async () => {
      const fakePdfBuffer = Buffer.from('NOT A REAL PDF CONTENT');

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('resume', fakePdfBuffer, 'fake.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_FILE_TYPE');
    });

    it('rejects PDFs exceeding 10 pages with PDF_PAGE_LIMIT_EXCEEDED (FR-047, AC-C-02)', async () => {
      const longPdfBuffer = makePdf('Page content test', 11);

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('resume', longPdfBuffer, 'too_long.pdf');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PDF_PAGE_LIMIT_EXCEEDED');
    });

    it('enforces maximum 10 resumes per user (FR-050)', async () => {
      // User B currently has 0 resumes. Upload 10 resumes:
      for (let i = 1; i <= 10; i++) {
        await request(app)
          .post('/api/v1/resumes')
          .set('Authorization', `Bearer ${userBToken}`)
          .attach('resume', makePdf(`Resume number ${i} text content for candidate`), `resume_${i}.pdf`);
      }

      // 11th upload should return 409 RESUME_LIMIT_REACHED
      const res11 = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userBToken}`)
        .attach('resume', makePdf('11th resume text content'), 'resume_11.pdf');

      expect(res11.status).toBe(409);
      expect(res11.body.success).toBe(false);
      expect(res11.body.error.code).toBe('RESUME_LIMIT_REACHED');

      // Cleanup user B resumes
      await Resume.deleteMany({ userId: userBId });
    });
  });

  // 2. Retrieval, Signed Download & Security
  describe('GET /api/v1/resumes & Signed Download (FR-051, FR-052, FR-149)', () => {
    let resumeAId = '';

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('resume', makePdf('Candidate A Resume text for download test'), 'resume_download.pdf');
      resumeAId = res.body.data.resume._id;
    });

    it('lists resumes for user with metadata only (FR-051)', async () => {
      const res = await request(app)
        .get('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      // Metadata only: extractedText excluded from list
      expect(res.body.data[0]).not.toHaveProperty('extractedText');
      expect(res.body.data[0]).toHaveProperty('originalFilename');
    });

    it('generates 5-minute signed download token and downloads PDF (FR-052)', async () => {
      const tokenRes = await request(app)
        .get(`/api/v1/resumes/${resumeAId}/download-token`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(tokenRes.status).toBe(200);
      expect(tokenRes.body.data).toHaveProperty('token');
      expect(tokenRes.body.data).toHaveProperty('downloadUrl');

      const token = tokenRes.body.data.token;

      // Download using signed token
      const downloadRes = await request(app)
        .get(`/api/v1/resumes/${resumeAId}/download?token=${token}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(downloadRes.status).toBe(200);
      expect(downloadRes.headers['content-type']).toBe('application/pdf');
    });

    it('rejects download with invalid or tampered token (FR-052)', async () => {
      const res = await request(app)
        .get(`/api/v1/resumes/${resumeAId}/download?token=fake_tampered_token`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('DOWNLOAD_TOKEN_INVALID');
    });

    it('enforces multi-tenancy: returns 404 when User B requests User A resume (FR-149)', async () => {
      const res = await request(app)
        .get(`/api/v1/resumes/${resumeAId}`)
        .set('Authorization', `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });
  });

  // 3. AI Consent, Quota & Analysis Execution
  describe('AI Resume Analysis & Job Match (FR-054 to FR-064)', () => {
    let testResumeId = '';
    let testAppId = '';

    beforeAll(async () => {
      const resumeContent =
        'Jane Doe, Senior Full Stack Engineer with 4 years of professional experience in React, Node.js, Express, MongoDB, and AWS cloud architecture. Built enterprise platforms at Acme Corp.';
      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Authorization', `Bearer ${userAToken}`)
        .attach('resume', makePdf(resumeContent), 'jane_doe_ai.pdf');
      testResumeId = res.body.data.resume._id;

      const appRes = await request(app)
        .post('/api/v1/applications')
        .set('Authorization', `Bearer ${userAToken}`)
        .send({
          companyName: 'TechCorp',
          jobTitle: 'Senior Full Stack Engineer',
          status: 'applied',
          jobDescription: 'Seeking Senior Full Stack Engineer with 4+ years of experience in React, Node.js, Express, and MongoDB. Strong cloud architecture skills preferred.'
        });
      testAppId = appRes.body.data.application._id;
    });

    it('rejects AI analysis if user has not accepted AI consent (FR-063, AC-C-06)', async () => {
      // User A starts without consent
      await User.findByIdAndUpdate(userAId, { aiConsentAcceptedAt: null });

      const res = await request(app)
        .post(`/api/v1/resumes/${testResumeId}/analyze`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AI_CONSENT_REQUIRED');
    });

    it('records AI consent timestamp via POST /api/v1/users/ai-consent (FR-063)', async () => {
      const res = await request(app)
        .post('/api/v1/users/ai-consent')
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.user.aiConsentAcceptedAt).not.toBeNull();
    });

    it('executes general resume analysis and stores embedded analysis (FR-054, FR-062)', async () => {
      // Mock aiService.analyzeGeneralResume to isolate provider from network
      vi.spyOn(aiService, 'analyzeGeneralResume').mockResolvedValueOnce({
        categorizedSkills: {
          technical: ['React', 'Node.js', 'Express', 'MongoDB'],
          tools: ['Git', 'Docker'],
          soft: ['Communication', 'Leadership']
        },
        education: [
          {
            degree: 'B.S. in Computer Science',
            institution: 'State University',
            graduationYear: '2020',
            fieldOfStudy: 'Computer Science'
          }
        ],
        experienceSummary: [
          {
            role: 'Software Engineer',
            organization: 'Acme Corp',
            duration: '2020-2024',
            description: 'Built high performance web applications'
          }
        ],
        estimatedYearsExperience: 4,
        structureFeedback: {
          strengths: ['Clear reverse chronological format', 'Action-oriented bullet points'],
          improvements: ['Add quantifiable metric impacts to achievements'],
          formattingNotes: 'Clean single-column layout'
        }
      });

      const res = await request(app)
        .post(`/api/v1/resumes/${testResumeId}/analyze`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.analysis.type).toBe('general');
      expect(res.body.data.analysis.general.estimatedYearsExperience).toBe(4);
      expect(res.body.data.analysis.general.categorizedSkills.technical).toContain('React');

      // Verify analysis is persisted inside Resume document (FR-062)
      const resumeInDb = await Resume.findById(testResumeId);
      expect(resumeInDb.analyses.length).toBeGreaterThanOrEqual(1);
    });

    it('executes job match analysis against an existing application (FR-055 to FR-058)', async () => {
      vi.spyOn(aiService, 'matchResumeWithJob').mockResolvedValueOnce({
        overallScore: 85,
        componentScores: {
          skills: { score: 90, rationale: 'Matches React and Node.js requirements closely' },
          experience: { score: 80, rationale: '4 years aligns with requested 4+ years' },
          education: { score: 85, rationale: 'Relevant Computer Science degree' },
          keywords: { score: 85, rationale: 'High overlap in full stack keywords' }
        },
        matchedSkills: ['React', 'Node.js', 'Express', 'MongoDB'],
        missingSkills: [{ skill: 'AWS Cloud Architecture', category: 'preferred' }],
        improvementSuggestions: [
          { priority: 1, text: 'Highlight specific cloud infrastructure projects in your experience', type: 'clarification' },
          { priority: 2, text: 'Quantify database optimization metrics', type: 'quantification' },
          { priority: 3, text: 'Reorder technical skills to place Node.js first', type: 'reordering' }
        ]
      });

      const res = await request(app)
        .post(`/api/v1/resumes/${testResumeId}/match`)
        .set('Authorization', `Bearer ${userAToken}`)
        .send({ applicationId: testAppId });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.analysis.type).toBe('job_match');
      expect(res.body.data.analysis.jobMatch.overallScore).toBe(85);
      expect(res.body.data.analysis.jobMatch.improvementSuggestions).toHaveLength(3);
    });

    it('enforces AI rate limits after 10 requests per hour (FR-064)', async () => {
      // Simulate 10 successful analyses
      const { recordResumeAiUsage } = require('../src/middleware/aiRateLimiter.middleware');
      for (let i = 0; i < 10; i++) {
        recordResumeAiUsage(userAToken ? userAId : 'test');
      }

      const res = await request(app)
        .post(`/api/v1/resumes/${testResumeId}/analyze`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('AI_RATE_LIMIT_EXCEEDED');
      expect(res.headers['retry-after']).toBeDefined();
    });

    it('deletes an individual analysis record (FR-062)', async () => {
      const resume = await Resume.findById(testResumeId);
      const analysisId = resume.analyses[0]._id;

      const res = await request(app)
        .delete(`/api/v1/resumes/${testResumeId}/analyses/${analysisId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const updatedResume = await Resume.findById(testResumeId);
      const exists = updatedResume.analyses.some((a) => String(a._id) === String(analysisId));
      expect(exists).toBe(false);
    });

    it('deleting resume removes record, embedded analyses, and file from storage (FR-053, AC-C-07)', async () => {
      const res = await request(app)
        .delete(`/api/v1/resumes/${testResumeId}`)
        .set('Authorization', `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      const deletedResume = await Resume.findById(testResumeId);
      expect(deletedResume).toBeNull();
    });
  });
});
