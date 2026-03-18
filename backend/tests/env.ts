process.env.NODE_ENV = 'development';
process.env.DATABASE_URL ||= 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET ||= '12345678901234567890123456789012';
process.env.JWT_REFRESH_SECRET ||= '12345678901234567890123456789012';
