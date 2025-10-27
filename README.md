# Snout OS - Pet Care Management System

A complete pet care management system built with Next.js, featuring booking management, sitter coordination, payment processing, and automated communications.

## Features

- **Booking Management**: Complete booking lifecycle management
- **Sitter Coordination**: Sitter assignment and conflict detection
- **Payment Processing**: Live Stripe integration with analytics
- **SMS Automation**: OpenPhone integration for automated messaging
- **Calendar Integration**: Google Calendar sync
- **Mobile Dashboard**: Mobile-friendly sitter interface
- **Background Jobs**: Automated reminders and summaries

## Tech Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Payments**: Stripe (Live Integration)
- **SMS**: OpenPhone API
- **Calendar**: Google Calendar API
- **Background Jobs**: BullMQ with Redis
- **Styling**: Tailwind CSS

## Getting Started

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Set up Environment Variables**
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your credentials
   ```

3. **Set up Database**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

5. **Open Application**
   ```
   http://localhost:3000
   ```

## Environment Variables

Required environment variables:

- `DATABASE_URL`: PostgreSQL connection string
- `STRIPE_SECRET_KEY`: Stripe secret key (live)
- `STRIPE_PUBLISHABLE_KEY`: Stripe publishable key (live)
- `OPENPHONE_API_KEY`: OpenPhone API key
- `OPENPHONE_NUMBER_ID`: OpenPhone number ID
- `OWNER_PHONE`: Owner's phone number for notifications
- `REDIS_URL`: Redis connection string for background jobs

## Project Structure

```
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
