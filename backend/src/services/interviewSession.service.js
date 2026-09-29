const InterviewSession = require('../models/InterviewSession');
const Application = require('../models/Application');
const Resume = require('../models/Resume');
const aiService = require('./ai.service');
const { recordInterviewAiUsage } = require('../middleware/aiRateLimiter.middleware');
const AppError = require('../utils/appError');

class InterviewSessionService {
  /**
   * Create new practice or mock interview session with AI generated questions (FR-068, FR-069, FR-070)
   */
  async createSession(userId, data) {
    const {
      roleTitle,
      experienceLevel,
      questionTypes,
      count = 10,
      mode = 'practice',
      applicationId = null,
      resumeId = null
    } = data;

    let jobDescription = null;
    let resumeText = null;

    // Optional application tailoring
    if (applicationId) {
      const application = await Application.findOne({ _id: applicationId, userId });
      if (!application) {
        throw new AppError('Application not found', 404, 'APPLICATION_NOT_FOUND');
      }
      jobDescription = application.jobDescription;
    }

    // Optional resume tailoring
    if (resumeId) {
      const resume = await Resume.findOne({ _id: resumeId, userId });
      if (!resume) {
        throw new AppError('Resume not found', 404, 'RESUME_NOT_FOUND');
      }
      resumeText = resume.extractedText;
    }

    // Generate questions using Gemini
    const aiResult = await aiService.generateInterviewQuestions({
      roleTitle,
      experienceLevel,
      questionTypes,
      count,
      jobDescription,
      resumeText
    });

    // Record AI quota consumption on success (FR-061)
    recordInterviewAiUsage(userId);

    const questions = (aiResult.questions || []).map((q) => ({
      type: q.type,
      questionText: q.questionText,
      difficulty: q.difficulty || 'medium',
      focusTopic: q.focusTopic || '',
      exampleAnswer: null,
      userAnswer: '',
      isSkipped: false,
      revisit: false,
      feedback: null
    }));

    const session = await InterviewSession.create({
      userId,
      roleTitle,
      experienceLevel,
      questionTypes,
      mode,
      status: 'in_progress',
      applicationId: applicationId || null,
      resumeId: resumeId || null,
      currentQuestionIndex: 0,
      questions,
      summary: {
        totalQuestions: questions.length,
        answeredCount: 0,
        skippedCount: 0,
        averageRatings: {
          relevance: 0,
          structure: 0,
          clarity: 0,
          specificity: 0,
          overall: 0
        },
        revisitCount: 0,
        completedAt: null
      }
    });

    return session;
  }

  /**
   * List paginated interview sessions for authenticated user (FR-078)
   */
  async listSessions(userId, query = {}) {
    const page = Math.max(1, parseInt(query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
    const skip = (page - 1) * limit;

    const filter = { userId };
    if (query.mode) filter.mode = query.mode;
    if (query.status) filter.status = query.status;

    const [sessions, total] = await Promise.all([
      InterviewSession.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('applicationId', 'companyName jobTitle')
        .populate('resumeId', 'fileName')
        .lean(),
      InterviewSession.countDocuments(filter)
    ]);

    // Enhance each session with question counters
    const formattedSessions = sessions.map((s) => {
      const totalQ = s.questions?.length || 0;
      const answeredQ = s.questions?.filter((q) => q.userAnswer && q.userAnswer.trim().length > 0).length || 0;
      const skippedQ = s.questions?.filter((q) => q.isSkipped).length || 0;
      const revisitQ = s.questions?.filter((q) => q.revisit).length || 0;
      return {
        ...s,
        questionCount: totalQ,
        answeredCount: answeredQ,
        skippedCount: skippedQ,
        revisitCount: revisitQ
      };
    });

    return {
      sessions: formattedSessions,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1
      }
    };
  }

  /**
   * Get single interview session by ID (FR-078, FR-149)
   */
  async getSessionById(userId, sessionId) {
    const session = await InterviewSession.findOne({ _id: sessionId, userId })
      .populate('applicationId', 'companyName jobTitle location')
      .populate('resumeId', 'fileName');

    if (!session) {
      throw new AppError('Interview session not found', 404, 'SESSION_NOT_FOUND');
    }

    return session;
  }

  /**
   * Save user answer, skipped state, revisit flag, or current index (FR-072, FR-073, FR-079)
   */
  async saveAnswer(userId, sessionId, questionId, data) {
    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      throw new AppError('Interview session not found', 404, 'SESSION_NOT_FOUND');
    }

    const question = session.questions.id(questionId);
    if (!question) {
      throw new AppError('Question not found in session', 404, 'QUESTION_NOT_FOUND');
    }

    if (data.userAnswer !== undefined) {
      question.userAnswer = data.userAnswer;
      // If user typed an answer, mark isSkipped as false
      if (data.userAnswer && data.userAnswer.trim().length > 0) {
        question.isSkipped = false;
      }
    }

    if (data.isSkipped !== undefined) {
      question.isSkipped = data.isSkipped;
    }

    if (data.revisit !== undefined) {
      question.revisit = data.revisit;
    }

    if (data.currentQuestionIndex !== undefined) {
      session.currentQuestionIndex = Math.max(0, Math.min(session.questions.length - 1, data.currentQuestionIndex));
    }

    await session.save();

    return {
      question,
      session
    };
  }

  /**
   * Request sample/example answer for a question (FR-071)
   */
  async getExampleAnswer(userId, sessionId, questionId) {
    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      throw new AppError('Interview session not found', 404, 'SESSION_NOT_FOUND');
    }

    const question = session.questions.id(questionId);
    if (!question) {
      throw new AppError('Question not found in session', 404, 'QUESTION_NOT_FOUND');
    }

    // If already generated, return cached sample answer
    if (question.exampleAnswer) {
      return {
        exampleAnswer: question.exampleAnswer,
        isSample: true
      };
    }

    // Generate with Gemini
    const result = await aiService.generateExampleAnswer({
      questionText: question.questionText,
      roleTitle: session.roleTitle,
      experienceLevel: session.experienceLevel,
      focusTopic: question.focusTopic,
      type: question.type
    });

    recordInterviewAiUsage(userId);

    question.exampleAnswer = result.exampleAnswer;
    await session.save();

    return {
      exampleAnswer: result.exampleAnswer,
      isSample: true
    };
  }

  /**
   * Request structured AI feedback for an answer (FR-074, FR-075, FR-076)
   */
  async evaluateAnswer(userId, sessionId, questionId, userAnswer) {
    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      throw new AppError('Interview session not found', 404, 'SESSION_NOT_FOUND');
    }

    const question = session.questions.id(questionId);
    if (!question) {
      throw new AppError('Question not found in session', 404, 'QUESTION_NOT_FOUND');
    }

    const trimmedAnswer = (userAnswer || question.userAnswer || '').trim();

    // Enforce 20-character minimum without calling LLM (FR-075)
    if (trimmedAnswer.length < 20) {
      throw new AppError(
        'Answer must be at least 20 characters long to receive AI feedback. Please elaborate on your response.',
        400,
        'ANSWER_TOO_SHORT'
      );
    }

    // Call Gemini evaluation
    const feedback = await aiService.evaluateInterviewAnswer({
      questionText: question.questionText,
      userAnswer: trimmedAnswer,
      roleTitle: session.roleTitle,
      experienceLevel: session.experienceLevel,
      focusTopic: question.focusTopic
    });

    recordInterviewAiUsage(userId);

    question.userAnswer = trimmedAnswer;
    question.feedback = {
      summary: feedback.summary,
      strengths: feedback.strengths,
      areasToImprove: feedback.areasToImprove,
      ratings: feedback.ratings,
      createdAt: new Date()
    };

    await session.save();

    return {
      feedback: question.feedback,
      question
    };
  }

  /**
   * Complete mock or practice session and compute summary (FR-077)
   */
  async completeSession(userId, sessionId) {
    const session = await InterviewSession.findOne({ _id: sessionId, userId });
    if (!session) {
      throw new AppError('Interview session not found', 404, 'SESSION_NOT_FOUND');
    }

    const totalQuestions = session.questions.length;
    const answeredCount = session.questions.filter(
      (q) => q.userAnswer && q.userAnswer.trim().length > 0
    ).length;
    const skippedCount = session.questions.filter((q) => q.isSkipped).length;
    const revisitCount = session.questions.filter((q) => q.revisit).length;

    // Calculate average ratings across questions with feedback
    const questionsWithRatings = session.questions.filter(
      (q) => q.feedback && q.feedback.ratings && q.feedback.ratings.relevance
    );

    let avgRelevance = 0;
    let avgStructure = 0;
    let avgClarity = 0;
    let avgSpecificity = 0;
    let overall = 0;

    if (questionsWithRatings.length > 0) {
      const sumRelevance = questionsWithRatings.reduce((sum, q) => sum + q.feedback.ratings.relevance, 0);
      const sumStructure = questionsWithRatings.reduce((sum, q) => sum + q.feedback.ratings.structure, 0);
      const sumClarity = questionsWithRatings.reduce((sum, q) => sum + q.feedback.ratings.clarity, 0);
      const sumSpecificity = questionsWithRatings.reduce((sum, q) => sum + q.feedback.ratings.specificity, 0);

      avgRelevance = Number((sumRelevance / questionsWithRatings.length).toFixed(1));
      avgStructure = Number((sumStructure / questionsWithRatings.length).toFixed(1));
      avgClarity = Number((sumClarity / questionsWithRatings.length).toFixed(1));
      avgSpecificity = Number((sumSpecificity / questionsWithRatings.length).toFixed(1));
      overall = Number(((avgRelevance + avgStructure + avgClarity + avgSpecificity) / 4).toFixed(1));
    }

    session.status = 'completed';
    session.summary = {
      totalQuestions,
      answeredCount,
      skippedCount,
      revisitCount,
      averageRatings: {
        relevance: avgRelevance,
        structure: avgStructure,
        clarity: avgClarity,
        specificity: avgSpecificity,
        overall
      },
      completedAt: new Date()
    };

    await session.save();

    return session;
  }

  /**
   * Delete interview session (FR-078)
   */
  async deleteSession(userId, sessionId) {
    const session = await InterviewSession.findOneAndDelete({ _id: sessionId, userId });
    if (!session) {
      throw new AppError('Interview session not found', 404, 'SESSION_NOT_FOUND');
    }
    return { success: true };
  }
}

module.exports = new InterviewSessionService();
