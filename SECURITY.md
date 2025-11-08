# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please email the maintainers directly. Do not create a public GitHub issue.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

## Security Best Practices

### Environment Variables

- **Never** commit `.env`, `.env.local`, or any file containing secrets
- Always use `.env.example` as a template with placeholder values
- Rotate API keys regularly
- Use different keys for development, staging, and production

### Database

- Use strong, unique passwords for database connections
- Enable SSL/TLS for database connections in production
- Regularly backup your database
- Keep Prisma and database drivers up to date

### API Keys

The following API keys should be kept secure:

- `OPENPHONE_API_KEY` - OpenPhone API key
- `STRIPE_SECRET_KEY` - Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
- `OPENPHONE_WEBHOOK_SECRET` - OpenPhone webhook signing secret
- Database credentials in `DATABASE_URL`

### Production Deployment

- Always use HTTPS in production
- Set `NODE_ENV=production`
- Enable webhook signature verification
- Use strong `NEXTAUTH_SECRET` values
- Implement rate limiting for public endpoints
- Monitor logs for suspicious activity

### Code Review

- All environment variables should use `process.env.*`
- No hardcoded secrets or API keys
- Sensitive data should never be logged
- User input should be validated and sanitized

## Known Security Considerations

### Webhook Endpoints

- `/api/webhooks/sms` - OpenPhone webhook (signature verification recommended)
- `/api/webhooks/stripe` - Stripe webhook (signature verification required)

### Public Endpoints

- `/booking-form.html` - Public booking form (rate limiting recommended)
- `/api/form` - Public form submission (rate limiting recommended)

### Authentication

Currently, the dashboard does not have authentication. It is recommended to:

1. Add authentication before deploying to production
2. Implement role-based access control
3. Use NextAuth.js or similar for session management
4. Protect all `/api/*` routes (except webhooks and public forms)

## Dependencies

- Regularly update dependencies: `npm audit` and `npm update`
- Review security advisories for critical dependencies
- Use `npm audit fix` to automatically fix known vulnerabilities

