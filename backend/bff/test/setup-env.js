if (!process.env.JWT_SECRET && !process.env.ADMIN_TOKEN_SECRET) {
  process.env.JWT_SECRET = "test-secret-key-for-jest-1234567890"
}
