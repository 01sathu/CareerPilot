const { PDFParse, PasswordException, InvalidPDFException } = require('pdf-parse');
const Resume = require('../models/Resume');
const Application = require('../models/Application');
const storageService = require('./storage.service');
const aiService = require('./ai.service');
const { recordResumeAiUsage } = require('../middleware/aiRateLimiter.middleware');
const AppError = require('../utils/appError');

/**
 * Validates PDF buffer and extracts text and page count (FR-046, FR-047, FR-049)
 */
const parsePdfBuffer = async (buffer) => {
  // 1. Magic bytes check: Must start with %PDF- (FR-047)
  const header = buffer.slice(0, 5).toString('ascii');
  if (header !== '%PDF-') {
    throw new AppError('File must be a valid PDF document', 400, 'INVALID_FILE_TYPE');
  }

  // 2. Encryption signature heuristic check
  const bufferString = buffer.toString('binary');
  if (bufferString.includes('/Encrypt')) {
    // Check if truly encrypted or just contains word in text
    // We will let PDFParse attempt to open it
  }

  let parser;
  try {
    parser = new PDFParse({ data: buffer });
    await parser.load();
    const textResult = await parser.getText();
    const pageCount = textResult.total || (textResult.pages ? textResult.pages.length : 1);
    const rawText = textResult.text || '';

    // 3. Page limit check (FR-047: max 10 pages)
    if (pageCount > 10) {
      throw new AppError('PDF cannot exceed 10 pages', 400, 'PDF_PAGE_LIMIT_EXCEEDED');
    }

    // 4. Character extraction check (FR-049: min 100 chars, max 50,000 chars)
    const cleanedText = rawText.trim();
    let extractionStatus = 'success';
    let extractionErrorMessage = '';

    if (cleanedText.length < 100) {
      extractionStatus = 'failed';
      extractionErrorMessage =
        'Scanned or image-only PDFs are not supported. At least 100 extractable characters are required.';
    }

    const truncatedText = cleanedText.slice(0, 50000);

    return {
      pageCount,
      extractedText: truncatedText,
      extractionStatus,
      extractionErrorMessage
    };
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }

    if (
      err instanceof PasswordException ||
      err.name === 'PasswordException' ||
      err.message?.toLowerCase().includes('password') ||
      err.message?.toLowerCase().includes('encrypted')
    ) {
      throw new AppError(
        'Encrypted or password-protected PDFs are not supported',
        400,
        'PDF_ENCRYPTED'
      );
    }

    if (err instanceof InvalidPDFException || err.name === 'InvalidPDFException') {
      throw new AppError('File is corrupted or has an invalid PDF structure', 400, 'INVALID_FILE_TYPE');
    }

    throw new AppError(
      err.message || 'Failed to process PDF document',
      400,
      'PDF_PROCESSING_ERROR'
    );
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // Ignore destroy error
      }
    }
  }
};

/**
 * Upload and process a new PDF resume (FR-046 - FR-050)
 */
const uploadResume = async (userId, file) => {
  if (!file || !file.buffer) {
    throw new AppError('Please provide a PDF resume file to upload', 400, 'FILE_REQUIRED');
  }

  // Check 5 MB size limit (FR-046)
  const MAX_SIZE = 5 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new AppError('File size cannot exceed 5 MB', 400, 'FILE_TOO_LARGE');
  }

  // Check MIME type or extension
  const isPdfMime = file.mimetype === 'application/pdf';
  const isPdfExt = file.originalname?.toLowerCase().endsWith('.pdf');
  if (!isPdfMime && !isPdfExt) {
    throw new AppError('Only PDF documents are allowed', 400, 'INVALID_FILE_TYPE');
  }

  // Check 10-resume limit per user (FR-050)
  const existingCount = await Resume.countDocuments({ userId });
  if (existingCount >= 10) {
    throw new AppError(
      'Each user may store at most 10 resumes. Please delete an older resume before uploading another.',
      409,
      'RESUME_LIMIT_REACHED'
    );
  }

  // Parse and validate PDF contents
  const { pageCount, extractedText, extractionStatus, extractionErrorMessage } =
    await parsePdfBuffer(file.buffer);

  // Store file in private user storage (FR-048)
  const storageKey = await storageService.uploadResume(userId, file.buffer);

  // Sanitize original filename (keep metadata only, never use as path)
  const sanitizedFilename = (file.originalname || 'resume.pdf')
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .slice(0, 255);

  const resume = new Resume({
    userId,
    originalFilename: sanitizedFilename,
    storageKey,
    fileSize: file.size,
    pageCount,
    extractedText,
    extractionStatus,
    extractionErrorMessage
  });

  await resume.save();
  return resume;
};

/**
 * List all resumes for user (metadata only, FR-051)
 */
const listResumes = async (userId) => {
  return Resume.find({ userId })
    .select('-extractedText')
    .sort({ createdAt: -1 });
};

/**
 * Get resume details by ID with extracted text and analyses (FR-051)
 */
const getResumeById = async (userId, resumeId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    throw new AppError('Resume not found', 404, 'NOT_FOUND');
  }
  return resume;
};

/**
 * Generate 5-minute signed token for secure download (FR-052)
 */
const getDownloadToken = async (userId, resumeId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    throw new AppError('Resume not found', 404, 'NOT_FOUND');
  }

  const { token, expiresAt } = storageService.generateSignedDownloadToken(
    userId,
    resume.storageKey,
    resumeId
  );

  return {
    downloadUrl: `/api/v1/resumes/${resumeId}/download?token=${token}`,
    token,
    expiresAt,
    originalFilename: resume.originalFilename
  };
};

/**
 * Get file buffer for download after verifying signed token (FR-052)
 */
const getResumeFileForDownload = async (userId, resumeId, token) => {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    throw new AppError('Resume not found', 404, 'NOT_FOUND');
  }

  const isValidToken = storageService.verifySignedDownloadToken(
    userId,
    resume.storageKey,
    token
  );

  if (!isValidToken) {
    throw new AppError('Download link is invalid or has expired', 403, 'DOWNLOAD_TOKEN_INVALID');
  }

  const buffer = await storageService.getFileBuffer(resume.storageKey);
  return {
    buffer,
    filename: resume.originalFilename
  };
};

/**
 * Delete resume and all associated files and analyses (FR-053)
 */
const deleteResume = async (userId, resumeId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    throw new AppError('Resume not found', 404, 'NOT_FOUND');
  }

  // Delete file from disk / cloud storage (FR-053)
  await storageService.deleteFile(resume.storageKey);

  // Delete database record and embedded analyses
  await Resume.deleteOne({ _id: resumeId, userId });
  return { success: true };
};

/**
 * Run General AI Resume Analysis (FR-054, FR-062)
 */
const analyzeGeneralResume = async (userId, resumeId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    throw new AppError('Resume not found', 404, 'NOT_FOUND');
  }

  if (resume.extractionStatus === 'failed' || !resume.extractedText) {
    throw new AppError(
      'Cannot analyze a resume with failed text extraction. Please upload a standard text PDF.',
      400,
      'PDF_EXTRACTION_FAILED'
    );
  }

  // Call AI Service
  const analysisResult = await aiService.analyzeGeneralResume(resume.extractedText);

  // Save embedded analysis (keeping 20 most recent, FR-062)
  const analysisEntry = {
    type: 'general',
    general: analysisResult,
    createdAt: new Date()
  };

  resume.addAnalysis(analysisEntry);
  await resume.save();

  // Record successful quota usage (FR-061, FR-064)
  recordResumeAiUsage(userId);

  return {
    analysis: resume.analyses[0],
    resumeId: resume._id
  };
};

/**
 * Run Job Match Analysis (FR-055 - FR-058, FR-062)
 */
const matchResumeWithJob = async (userId, resumeId, { applicationId, jobDescription }) => {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    throw new AppError('Resume not found', 404, 'NOT_FOUND');
  }

  if (resume.extractionStatus === 'failed' || !resume.extractedText) {
    throw new AppError(
      'Cannot analyze a resume with failed text extraction.',
      400,
      'PDF_EXTRACTION_FAILED'
    );
  }

  let targetJobDescription = '';
  let companyName = '';
  let jobTitle = '';

  if (applicationId) {
    const application = await Application.findOne({ _id: applicationId, userId });
    if (!application) {
      throw new AppError('Referenced application not found', 404, 'NOT_FOUND');
    }

    if (!application.jobDescription || application.jobDescription.trim().length < 50) {
      throw new AppError(
        'The selected application does not have a job description of at least 50 characters.',
        400,
        'INVALID_JOB_DESCRIPTION'
      );
    }

    targetJobDescription = application.jobDescription;
    companyName = application.companyName;
    jobTitle = application.jobTitle;
  } else if (jobDescription) {
    targetJobDescription = jobDescription.trim();
  } else {
    throw new AppError(
      'You must supply either an applicationId or pasted jobDescription text of 50-10,000 characters',
      400,
      'INVALID_INPUT'
    );
  }

  // Call AI Service
  const matchResult = await aiService.matchResumeWithJob(resume.extractedText, targetJobDescription);

  // Save embedded analysis
  const analysisEntry = {
    type: 'job_match',
    applicationId: applicationId || null,
    companyName,
    jobTitle,
    jobMatch: matchResult,
    createdAt: new Date()
  };

  resume.addAnalysis(analysisEntry);
  await resume.save();

  // Record quota
  recordResumeAiUsage(userId);

  return {
    analysis: resume.analyses[0],
    resumeId: resume._id
  };
};

/**
 * Delete single embedded analysis record (FR-062)
 */
const deleteAnalysis = async (userId, resumeId, analysisId) => {
  const resume = await Resume.findOne({ _id: resumeId, userId });
  if (!resume) {
    throw new AppError('Resume not found', 404, 'NOT_FOUND');
  }

  const initialLength = resume.analyses.length;
  resume.analyses = resume.analyses.filter((a) => a._id.toString() !== String(analysisId));

  if (resume.analyses.length === initialLength) {
    throw new AppError('Analysis record not found', 404, 'NOT_FOUND');
  }

  await resume.save();
  return { success: true };
};

module.exports = {
  uploadResume,
  listResumes,
  getResumeById,
  getDownloadToken,
  getResumeFileForDownload,
  deleteResume,
  analyzeGeneralResume,
  matchResumeWithJob,
  deleteAnalysis,
  parsePdfBuffer
};
