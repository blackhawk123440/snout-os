# 📄 All Available Pages

Complete list of all pages in the Enterprise Messaging Dashboard.

## 🔐 Authentication

### Login Page
- **URL**: http://localhost:3000/login
- **Description**: Login form for owners and sitters
- **Demo Credentials**:
  - Email: `owner@example.com`
  - Password: `password123`

## 🏠 Main Pages

### Home/Setup
- **URL**: http://localhost:3000
- **Description**: Redirects to setup wizard if not configured, or dashboard if configured

### Dashboard
- **URL**: http://localhost:3000/dashboard
- **Description**: Main dashboard with overview metrics
- **Access**: Owner only

### Inbox/Messages
- **URL**: http://localhost:3000/inbox
- **Description**: Owner inbox with thread list, message view, and compose
- **Features**:
  - Thread list with filters
  - Message view with delivery status
  - Compose box (thread-bound)
  - Routing explanation drawer
  - Policy violation handling
  - Retry failed deliveries
- **Access**: Owner only

## 📱 Sitter Pages

### Sitter Landing
- **URL**: http://localhost:3000/sitter
- **Description**: Redirects to sitter inbox

### Sitter Inbox
- **URL**: http://localhost:3000/sitter/inbox
- **Description**: Sitter's view of assigned threads
- **Features**:
  - Only shows threads with active assignment windows
  - Message view (redacted content)
  - Compose messages
  - Cannot see client phone numbers
- **Access**: Sitter only

## ⚙️ Configuration Pages

### Setup Wizard
- **URL**: http://localhost:3000/setup
- **Description**: 7-step setup wizard for initial configuration
- **Steps**:
  1. Connect Provider
  2. Verify Connectivity
  3. Front Desk Number
  4. Sitter Numbers
  5. Pool Numbers
  6. Webhook Installation
  7. System Readiness

### Numbers
- **URL**: http://localhost:3000/numbers
- **Description**: Number inventory management
- **Features**:
  - View all numbers (front desk, sitter, pool)
  - Buy/import numbers
  - Assign numbers to sitters
  - Quarantine numbers
  - Health monitoring
- **Access**: Owner only

### Routing
- **URL**: http://localhost:3000/routing
- **Description**: Routing rules and overrides
- **Features**:
  - View routing rules
  - Create routing overrides
  - View routing history
  - Simulate routing decisions
- **Access**: Owner only

### Assignments
- **URL**: http://localhost:3000/assignments
- **Description**: Sitter assignment windows
- **Features**:
  - Create assignment windows
  - View active assignments
  - Manage booking references
- **Access**: Owner only

## 🤖 Automation Pages

### Automations List
- **URL**: http://localhost:3000/automations
- **Description**: List of all automations
- **Access**: Owner only

### Create Automation
- **URL**: http://localhost:3000/automations/new
- **Description**: Create a new automation
- **Access**: Owner only

### Edit Automation
- **URL**: http://localhost:3000/automations/[id]/edit
- **Description**: Edit an existing automation
- **Access**: Owner only

## 📊 Monitoring Pages

### Alerts
- **URL**: http://localhost:3000/alerts
- **Description**: System alerts and notifications
- **Features**:
  - Critical alerts (delivery failures, policy violations)
  - Warning alerts (quarantined numbers, retries)
  - Info alerts (automation executions)
- **Access**: Owner only

### Audit Log
- **URL**: http://localhost:3000/audit
- **Description**: Complete audit trail
- **Features**:
  - Filter by event type, entity, date range
  - Search by correlation ID
  - Export to CSV
  - View full event details
- **Access**: Owner only

### Operations (DLQ Viewer)
- **URL**: http://localhost:3000/ops
- **Description**: Dead-letter queue viewer and health checks
- **Features**:
  - View failed jobs (message retries, automations)
  - Replay failed jobs
  - Ignore jobs
  - Health status (provider, webhooks, queues, DB)
- **Access**: Owner only

## ⚙️ Settings

### Settings
- **URL**: http://localhost:3000/settings
- **Description**: System settings and configuration
- **Features**:
  - Provider connection status
  - Webhook status
  - Queue health
  - DB latency
- **Access**: Owner only

## 🚀 Quick Access

### Start the App
```bash
cd enterprise-messaging-dashboard
pnpm dev
```

### Access URLs
- **Web**: http://localhost:3000
- **API**: http://localhost:3001

### Quick Navigation
1. **Login**: http://localhost:3000/login
2. **Dashboard**: http://localhost:3000/dashboard
3. **Inbox**: http://localhost:3000/inbox
4. **Sitter Inbox**: http://localhost:3000/sitter/inbox (login as sitter)
5. **Numbers**: http://localhost:3000/numbers
6. **Routing**: http://localhost:3000/routing
7. **Assignments**: http://localhost:3000/assignments
8. **Automations**: http://localhost:3000/automations
9. **Alerts**: http://localhost:3000/alerts
10. **Audit**: http://localhost:3000/audit
11. **Ops**: http://localhost:3000/ops
12. **Settings**: http://localhost:3000/settings

## 🔑 User Roles

### Owner
- Full access to all pages
- Can manage numbers, routing, assignments, automations
- Can view audit logs and DLQ

### Sitter
- Access only to `/sitter/inbox`
- Can view and respond to assigned threads
- Cannot see client phone numbers
- Cannot access owner-only pages

## 📝 Notes

- All pages require authentication except `/login` and `/setup`
- Sitter pages automatically redirect owners to dashboard
- Owner pages automatically redirect sitters to sitter inbox
- Setup wizard runs on first access if system not configured
