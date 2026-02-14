# Snout OS - Pet Services Management System

A comprehensive dashboard for managing pet care services, bookings, sitters, and automations.

## Features

- 📅 **Booking Management** - Create and manage pet service bookings
- 👥 **Sitter Management** - Manage sitter profiles and assignments
- 📱 **SMS Integration** - Twilio integration for enterprise messaging
- 💳 **Payment Processing** - Stripe integration for payments
- 🤖 **Automations** - Configurable automated messages and reminders
- 📊 **Analytics** - Dashboard with booking and payment analytics
- 📆 **Calendar View** - Visual calendar with conflict detection
- 🔄 **Sitter Pool** - Automated sitter matching and assignment

## How to Run Proof-Pack Locally

The proof-pack is an automated test suite that verifies core operability features. It generates screenshots, network logs, and test reports.

### Prerequisites

- Docker Compose (for Postgres + Redis) or existing database/Redis
- Node.js 20+
- pnpm

### Running the Proof-Pack

```bash
pnpm pilot:smoke
```

This will:
1. Boot infrastructure (Docker Compose if available)
2. Run database migrations
3. Seed test data
4. Start the dev server
5. Run smoke tests (role routing, messaging features, pool exhausted, rotation settings)
6. Generate proof-pack artifacts in `proof-pack/`

### Proof-Pack Artifacts

After running, check `proof-pack/` for:
- `playwright-report/` - HTML test report
- `screenshots/` - Test screenshots
- `summary.json` - Commit SHA, timestamp, test summary

### Smoke Test Suite

The smoke suite (`pnpm test:ui:smoke`) includes only critical operability tests:
- Role-based routing (owner vs sitter)
- Messaging features (delivery badges, retry, policy banners, routing drawer)
- Pool exhausted confirmation flow
- Rotation settings persistence

Full test suite (`pnpm test:ui:full`) includes all tests including visual regression.

### Troubleshooting

- **Application fails to start**: Check `DATABASE_URL` and port 3000 availability
- **Tests fail**: Check `proof-pack/playwright-report/index.html` for details
- **Seed fails**: Ensure `ENABLE_OPS_SEED=true` is set

## Getting Started

### Prerequisites

- Node.js 20+
- npm or pnpm
- PostgreSQL or SQLite database (for development)
- Redis (optional, for background jobs)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd snout-os
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and fill in your configuration values.

### Local Messaging Setup

To enable the new messaging inbox UI in local development:

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. In `.env.local`, ensure these variables are set:
   ```bash
   NEXT_PUBLIC_ENABLE_MESSAGING_V1=true
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

3. Restart the development server:
   ```bash
   npm run dev
   ```

4. Navigate to `/messages` - you should see the new inbox UI with the "Messaging: ON" badge (owner-only).

**Note**: The messaging feature flag can be toggled by setting `NEXT_PUBLIC_ENABLE_MESSAGING_V1=true` (enabled) or `false` (disabled) in `.env.local`.

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
- `NEXTAUTH_SECRET` - NextAuth.js secret key (generate with: `openssl rand -base64 32`)
- `NEXTAUTH_URL` - Your app URL (e.g., `https://snout-os-staging.onrender.com` or `http://localhost:3000`)
- `TWILIO_ACCOUNT_SID` - Twilio Account SID (get from Twilio Console)
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token (get from Twilio Console)

**Recommended:**
- `STRIPE_SECRET_KEY` - For payment processing
- `STRIPE_PUBLISHABLE_KEY` - For payment links
- `OWNER_PERSONAL_PHONE` - Owner's personal phone number

**Optional:**
- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)
- `GOOGLE_CLIENT_ID` - For Google Calendar integration
- `GOOGLE_CLIENT_SECRET` - For Google Calendar integration
- `NEXT_PUBLIC_ENABLE_MESSAGING_V1` - Enable new messaging inbox UI (default: false)
- `NEXT_PUBLIC_API_URL` - API server URL (default: http://localhost:3001)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run typecheck` - Run TypeScript type checking
- `npm run db:push` - Push database schema
- `npm run db:seed` - Seed database with sample data
- `npm run db:studio` - Open Prisma Studio

## Project Structure

```
snout-os/
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/          # API routes
│   │   ├── bookings/     # Booking management
│   │   ├── calendar/     # Calendar view
│   │   ├── automation/   # Automation settings
│   │   ├── settings/     # System settings
│   │   └── [pages]/      # Other pages
│   ├── lib/              # Utility functions
│   │   ├── booking-utils.ts
│   │   ├── rates.ts
│   │   ├── openphone.ts
│   │   ├── automation-utils.ts
│   │   └── message-utils.ts
│   └── worker/           # Background workers
├── prisma/               # Database schema
├── public/               # Static assets
│   └── booking-form.html # Public booking form
└── tests/                # Test files
```

## Key Features

### Booking Management
- Create, edit, and track bookings
- Sitter assignment with conflict detection
- Status management (pending, confirmed, completed, cancelled)
- Multiple service types (Dog Walking, Drop-ins, House Sitting, Pet Taxi, 24/7 Care)
- Dynamic pricing based on service, duration, and pets

### Automations
- Booking confirmations (client, owner, sitter)
- Payment reminders
- Night-before reminders
- Sitter pool offers
- Post-visit thank you messages
- Customizable message templates
- Configurable phone routing (personal vs messaging provider)

### Payment Processing
- Stripe integration for payment links
- Multiple service pricing
- Tip link generation
- Payment tracking

### Calendar Integration
- Month view with booking overview
- Conflict detection for sitter assignments
- Multi-day booking support (House Sitting, 24/7 Care)
- Sitter filtering
- Mobile responsive

### Mobile Optimization
- Fully responsive design
- Touch-optimized controls
- Mobile-friendly calendar and forms
- Optimized for iOS and Android

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy

1. Build the application:
   ```bash
   npm run build
   ```

2. Set environment variables on your hosting platform

3. Deploy with:
   ```bash
   npm run start
   ```

## Health Checks

- `/api/health` - General health check
- `/api/integrations/test/stripe` - Stripe integration test
- `/api/integrations/test/database` - Database connection test
- `/api/setup/provider/status` - Messaging provider (Twilio) connection status

## Development

### Code Style

- TypeScript for all code
- 2 spaces for indentation
- ESLint and Prettier for formatting

### Testing

- Unit tests: `npm run test`
- E2E tests: `npm run test:ui`

## Security Notes

- Never commit `.env` or `.env.local` files
- Use environment variables for all secrets
- Enable HTTPS in production
- Regularly rotate API keys

## Support

For issues or questions, please check:
1. Application logs
2. Health check endpoints
3. Environment variables
4. Individual integration tests

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
