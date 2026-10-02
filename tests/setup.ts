import "dotenv/config";

// Every test file talks to the test database only.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
// Mock billing must be available in tests (it is refused in production).
(process.env as Record<string, string>).NODE_ENV = "test";
process.env.STRIPE_SECRET_KEY = "";
