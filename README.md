# Snout OS - Pet Services Management System

A comprehensive dashboard for managing pet care services, bookings, sitters, and automations.

## Features

- 📅 **Booking Management** - Create and manage pet service bookings
- 👥 **Sitter Management** - Manage sitter profiles and assignments
- 📱 **SMS Integration** - OpenPhone integration for automated messaging
- 💳 **Payment Processing** - Stripe integration for payments
- 🤖 **Automations** - Configurable automated messages and reminders
- 📊 **Analytics** - Dashboard with booking and payment analytics
- 📆 **Calendar View** - Visual calendar with conflict detection
- 🔄 **Sitter Pool** - Automated sitter matching and assignment

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

**Recommended:**
- `STRIPE_SECRET_KEY` - For payment processing
- `STRIPE_PUBLISHABLE_KEY` - For payment links
- `OWNER_PERSONAL_PHONE` - Owner's personal phone number
- `OWNER_OPENPHONE_PHONE` - Owner's OpenPhone number

**Optional:**
- `REDIS_URL` - Redis connection URL (default: redis://localhost:6379)
- `GOOGLE_CLIENT_ID` - For Google Calendar integration
- `GOOGLE_CLIENT_SECRET` - For Google Calendar integration

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
- Configurable phone routing (personal vs OpenPhone)

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
- `/api/integrations/openphone/health` - OpenPhone integration health
- `/api/integrations/test/stripe` - Stripe integration test
- `/api/integrations/test/database` - Database connection test

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
