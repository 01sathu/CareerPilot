const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const aiService = require('../src/services/ai.service');

const sampleResumeText = `
Jane Doe
Full-Stack Software Engineer
Email: jane.doe@example.com | Phone: 555-0199 | Location: San Francisco, CA

PROFESSIONAL SUMMARY
Senior Software Engineer with 6 years of experience building scalable web applications with React, Node.js, Express, TypeScript, and PostgreSQL. Experienced in distributed cloud systems and REST APIs.

WORK EXPERIENCE
Senior Full-Stack Engineer | TechCorp Inc. | 2021 - Present
- Architected microservices handling 2M requests/day using Node.js, TypeScript, and Redis.
- Built responsive UI components with React, Tailwind CSS, and TanStack Query.
- Reduced database latency by 35% through query indexing and schema optimization in MongoDB and PostgreSQL.

Software Engineer | StartupLabs | 2018 - 2021
- Developed RESTful API endpoints using Express and Mongoose.
- Implemented JWT authentication and role-based access control.
- Managed CI/CD pipelines using GitHub Actions and Docker.

EDUCATION
Bachelor of Science in Computer Science | University of California, Berkeley | 2014 - 2018

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, SQL
Frontend: React, Redux, HTML5, CSS3, Tailwind CSS
Backend: Node.js, Express.js, REST APIs, GraphQL
Databases: MongoDB, PostgreSQL, Redis
Tools: Git, Docker, AWS, Vitest, Jest
`;

const sampleJobDescription = `
Senior Software Engineer
Company: CloudScale Dynamics
Location: Remote

About the Role:
We are looking for a Senior Software Engineer to help build our next-generation cloud analytics platform.

Requirements:
- 5+ years of software development experience with JavaScript / TypeScript and Node.js.
- Strong proficiency in modern React and frontend state management.
- Solid understanding of REST APIs, database design (MongoDB, PostgreSQL), and microservices.
- Experience with Docker, cloud infrastructure, and CI/CD.
- Excellent communication and collaboration skills.

Preferred Qualifications:
- Experience with GraphQL and Redis caching.
- Familiarity with AI/LLM integrations.
`;

async function main() {
  console.log('========================================');
  console.log(`REAL GEMINI API TEST WITH MODEL: ${aiService.getModelName()}`);
  console.log('========================================');

  console.log('\n[1/2] Testing analyzeGeneralResume...');
  const t1 = Date.now();
  const genResult = await aiService.analyzeGeneralResume(sampleResumeText);
  const d1 = ((Date.now() - t1) / 1000).toFixed(2);
  console.log(`>>> analyzeGeneralResume SUCCESS in ${d1}s!`);
  console.log('Parsed general data:');
  console.log('- Estimated Experience:', genResult.estimatedYearsExperience, 'years');
  console.log('- Technical skills count:', genResult.categorizedSkills.technical.length);
  console.log('- Tools count:', genResult.categorizedSkills.tools.length);
  console.log('- Soft skills count:', genResult.categorizedSkills.soft.length);
  console.log('- Experience items:', genResult.experienceSummary.length);
  console.log('- Education items:', genResult.education.length);
  console.log('- Strengths:', genResult.structureFeedback.strengths);
  console.log('- Improvements:', genResult.structureFeedback.improvements);

  console.log('\n[2/2] Testing matchResumeWithJob...');
  const t2 = Date.now();
  const matchResult = await aiService.matchResumeWithJob(sampleResumeText, sampleJobDescription);
  const d2 = ((Date.now() - t2) / 1000).toFixed(2);
  console.log(`>>> matchResumeWithJob SUCCESS in ${d2}s!`);
  console.log('Parsed job match data:');
  console.log('- Overall Score:', matchResult.overallScore, '/ 100');
  console.log('- Skills Score:', matchResult.componentScores.skills.score);
  console.log('  Rationale:', matchResult.componentScores.skills.rationale);
  console.log('- Experience Score:', matchResult.componentScores.experience.score);
  console.log('  Rationale:', matchResult.componentScores.experience.rationale);
  console.log('- Education Score:', matchResult.componentScores.education.score);
  console.log('- Keywords Score:', matchResult.componentScores.keywords.score);
  console.log('- Matched Skills:', matchResult.matchedSkills);
  console.log('- Missing Skills:', matchResult.missingSkills);
  console.log('- Improvement Suggestions (' + matchResult.improvementSuggestions.length + '):');
  matchResult.improvementSuggestions.forEach(s => {
    console.log(`  [Priority ${s.priority}] (${s.type}): ${s.text}`);
  });

  console.log('\n========================================');
  console.log('ALL REAL GEMINI API CALLS PASSED & VALIDATED!');
  console.log('========================================');
}

main().catch(err => {
  console.error('\nFAILED:', err);
  process.exit(1);
});
