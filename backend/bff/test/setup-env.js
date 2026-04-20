if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-request-secret-key-for-jest-1234567890"
}

if (!process.env.ADMIN_TOKEN_SECRET) {
  process.env.ADMIN_TOKEN_SECRET = "test-admin-secret-key-for-jest-1234567890"
}

if (!process.env.ADMIN_QR_LOGIN_SECRET) {
  process.env.ADMIN_QR_LOGIN_SECRET = "test-admin-qr-login-secret-key-for-jest-1234567890"
}
