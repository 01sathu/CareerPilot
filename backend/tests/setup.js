const { connectDB, closeDB } = require('../src/config/db');
const User = require('../src/models/User');

beforeAll(async () => {
  await connectDB();
  // Clear test users if any remain from previous interrupted runs
  await User.deleteMany({ email: /@test\.com$/ });
});

afterAll(async () => {
  // Clean up test users
  await User.deleteMany({ email: /@test\.com$/ });
  await closeDB();
});
