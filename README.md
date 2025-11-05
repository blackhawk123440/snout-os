# Snout OS - Pet Services Management System

A comprehensive dashboard for managing pet care services, bookings, sitters, and automations.

## Features

- 📅 **Booking Management** - Create and manage pet service bookings
- 👥 **Sitter Management** - Manage sitter profiles and assignments
- 📱 **SMS Integration** - OpenPhone integration for automated messaging
- 💳 **Payment Processing** - Stripe integration for payments
- 🤖 **Automations** - Configurable automated messages and reminders
- 📊 **Analytics** - Dashboard with booking and payment analytics

## Getting Started

### Prerequisites

- Node.js 20+
- npm, pnpm, or yarn
- PostgreSQL or SQLite database
- Redis (for BullMQ queue)

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   # or
   pnpm install
   ```

3. Copy `.env.example` to `.env.local` and fill in your configuration:
   ```bash
   cp .env.example .env.local
   ```

4. Set up the database:
   ```bash
   npm run db:push
   npm run db:seed
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

See `.env.example` for all required environment variables.

**Required:**
- `DATABASE_URL` - Database connection string
- `OPENPHONE_API_KEY` - OpenPhone API key
- `OPENPHONE_NUMBER_ID` - OpenPhone number ID

**Optional:**
- `STRIPE_SECRET_KEY` - Stripe secret key
- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run typecheck` - Run TypeScript type checking
- `npm run test` - Run unit tests
- `npm run test:ui` - Run Playwright E2E tests
- `npm run db:push` - Push database schema
- `npm run db:seed` - Seed database
- `npm run db:studio` - Open Prisma Studio

## Health Checks

- `/api/health` - General health check
- `/api/integrations/openphone/health` - OpenPhone integration health

## Project Structure

```
snout-os/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   └── [pages]/      # Page components
│   ├── lib/              # Utility functions
│   └── worker/            # Background workers
├── prisma/               # Database schema and migrations
├── public/               # Static assets
└── tests/                # Test files
```

## Development

### Code Style

- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Use 2 spaces for indentation
- Use LF line endings

### Testing

- Unit tests: `npm run test`
- E2E tests: `npm run test:ui`
- Run tests in watch mode: `npm run test -- --watch`

## Production Deployment

1. Set all required environment variables
2. Run `npm run build`
3. Start the server with `npm run start`
4. Verify health endpoints are responding

## License

Private - All Rights Reserved

src/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── bookings/       # Booking management pages
│   ├── calendar/       # Calendar pages
│   ├── clients/        # Client management
│   ├── payments/       # Payment analytics
│   ├── settings/       # System settings
│   └── sitter/         # Mobile sitter dashboard
├── lib/                # Utility libraries
│   ├── booking-utils.ts
│   ├── rates.ts
│   ├── stripe.ts
│   ├── openphone.ts
│   └── sms-templates.ts
└── worker/             # Background job processing
    ├── automation-worker.ts
    └── index.ts
```

## Key Features

### Booking Management
- Create, edit, and track bookings
- Sitter assignment with conflict detection
- Status management (pending, confirmed, completed, cancelled)
- Pet quantity tracking

### Payment Processing
- Live Stripe integration
- Payment link generation
- Invoice creation
- Revenue analytics

### SMS Automation
- Automated booking confirmations
- Payment reminders
- Sitter notifications
- Customizable message templates

### Calendar Integration
- Google Calendar sync
- Event creation and management
- Conflict detection

### Mobile Sitter Dashboard
- Mobile-friendly interface
- Upcoming bookings view
- Earnings tracking
- Status updates

## Deployment

The application is configured for deployment on Render with:
- Automatic builds from Git
- Environment variable configuration
- Database migrations
- Background job processing

## License

Private - All rights reserved
