# Sitter Performance & Tiering System Design

## Overview

Enterprise-level performance and tiering system designed to scale from 8 to 25+ sitters. The system uses transparent metrics, rolling averages, and eligibility-based access to shape behavior through natural consequences rather than warnings or micromanagement.

---

## Service Reliability Score (0-100)

### Calculation Method

**Weekly Calculation** using rolling 30-day windows for dashboard visibility and rolling 26-week averages for tier eligibility and raises.

### Weighted Categories

| Category | Weight | Description |
|----------|--------|-------------|
| **Responsiveness** | 20% | Response time to booking requests, message replies, availability updates |
| **Booking Acceptance & Reliability** | 25% | Acceptance rate, completion rate, no-show rate |
| **Timeliness** | 20% | On-time arrivals, late arrivals, missed visits |
| **Visit Accuracy** | 20% | Missed care items, care errors, client complaints |
| **Engagement** | 10% | Monthly quota completion (rolling average) |
| **Professional Conduct** | 5% | Service events, corrective actions, policy violations |

### Scoring Formula (Pseudocode)

```
Service Reliability Score = 
  (Responsiveness_Score × 0.20) +
  (Acceptance_Reliability_Score × 0.25) +
  (Timeliness_Score × 0.20) +
  (Visit_Accuracy_Score × 0.20) +
  (Engagement_Score × 0.10) +
  (Professional_Conduct_Score × 0.05)

Where each category score is calculated as:
  Category_Score = (Positive_Events / Total_Events) × 100
  Clamped to 0-100 range
```

### Minimum Activity Threshold

**Provisional Score**: If a sitter has fewer than 8 completed visits in the rolling 30-day window, their score is marked as "Provisional" and displayed with an asterisk (*).

**Eligibility Impact**: Provisional scores do not disqualify from tier eligibility but are noted in tier review processes.

### Category-Specific Calculations

#### 1. Responsiveness (20%)
- **Booking Requests**: Time from offer to response (target: <24 hours)
- **Messages**: Average response time to client messages (target: <4 hours during active windows)
- **Availability Updates**: Frequency of availability status updates

```
Responsiveness_Score = 
  (Requests_Responded_Within_24h / Total_Requests) × 50 +
  (Messages_Responded_Within_4h / Total_Messages) × 30 +
  (Availability_Updates_Current / Total_Updates) × 20
```

#### 2. Booking Acceptance & Reliability (25%)
- **Acceptance Rate**: Accepted offers / Total offers (excluding declined overflow at higher tiers)
- **Completion Rate**: Completed bookings / Accepted bookings
- **No-Show Rate**: Missed visits without cancellation / Total scheduled visits

```
Acceptance_Reliability_Score = 
  (Acceptance_Rate × 40) +
  (Completion_Rate × 40) +
  ((1 - NoShow_Rate) × 20)
```

**Special Rules**:
- Foundation tier: All declines count against acceptance rate
- Reliant+: Declined overflow work (beyond quota) does not count against acceptance rate
- System-caused cancellations (routing errors, tech outages) excluded from calculations

#### 3. Timeliness (20%)
- **On-Time**: Arrived within 15 minutes of scheduled start
- **Late**: Arrived 15-60 minutes after scheduled start
- **Missed**: No arrival or >60 minutes late

```
Timeliness_Score = 
  (OnTime_Visits / Total_Visits) × 70 +
  (Late_Visits / Total_Visits) × 20 +
  ((1 - Missed_Visits / Total_Visits) × 10)
```

**Special Rules**:
- Client-caused delays (not ready, locked out) excluded
- Weather emergencies excluded
- First-time route delays excluded (grace period)

#### 4. Visit Accuracy (20%)
- **Missed Items**: Care checklist items not completed
- **Care Errors**: Incorrect medication, feeding, or care procedures
- **Client Complaints**: Formal complaints about service quality

```
Visit_Accuracy_Score = 
  ((1 - Missed_Items_Rate) × 50) +
  ((1 - Care_Errors_Rate) × 30) +
  ((1 - Complaints_Rate) × 20)
```

**Special Rules**:
- Unclear instructions from client excluded
- Equipment failures excluded
- First-time client setup issues excluded

#### 5. Engagement (10%)
- **Quota Completion**: Actual visits / Tier quota (rolling 30-day average)

```
Engagement_Score = 
  MIN((Actual_Visits / Tier_Quota), 1.0) × 100
```

**Special Rules**:
- Quota calculated as rolling average, not rigid weekly enforcement
- Medical leave, approved time off excluded
- System-caused low volume excluded

#### 6. Professional Conduct (5%)
- **Service Events**: Positive client feedback, thank-you notes
- **Corrective Actions**: Policy violations, warnings, incidents

```
Professional_Conduct_Score = 
  (Service_Events × 2) - (Corrective_Actions × 10)
  Clamped to 0-100
```

**Special Rules**:
- Minor policy infractions (first occurrence) excluded
- Major violations (safety, theft, harassment) result in immediate tier review

---

## Tier System

### Foundation Tier

**Monthly Quota**: 20-30 visits  
**Starting Pay**: $12.50/hour  
**Badge Concept**: Circular badge with subtle gradient (trust-building foundation)

**Eligibility**:
- New sitters automatically start here
- Service Reliability Score: No minimum (provisional scores accepted)
- Minimum activity: 8 completed visits in rolling 30-day window

**Perks**:
- Standard booking access
- Standard messaging during assignment windows
- Standard support channels
- Basic training resources

**Quota Rules**:
- Quota calculated as rolling 30-day average
- No penalty for declining work (but counts against acceptance rate)
- System-caused low volume excluded from quota calculations

---

### Reliant Tier

**Monthly Quota**: 35-45 visits  
**Pay Cap**: $13.75/hour (after 6 months if eligible)  
**Badge Concept**: Hexagonal badge with two-tone design (reliability established)

**Eligibility**:
- Service Reliability Score: ≥75 (rolling 26-week average)
- Minimum activity: 12 completed visits in rolling 30-day window
- Completion rate: ≥90% (rolling 30-day)
- No major professional conduct violations in past 90 days

**Perks**:
- Priority booking access (offered bookings before Foundation tier)
- Extended messaging windows (can message 2 hours before/after assignment window)
- Priority support response
- Access to advanced training modules
- **Overflow Work Protection**: Declining work beyond quota does not count against acceptance rate

**Quota Rules**:
- Quota calculated as rolling 30-day average
- Can decline overflow work (beyond 45 visits/month) without penalty
- System-caused low volume excluded

**Pay Raise Eligibility** (every 6 months):
- Service Reliability Score: ≥75 (rolling 26-week average)
- Completion rate: ≥90% (rolling 26-week average)
- No major professional conduct violations
- Raise: +2.5% (capped at $13.75/hour)

---

### Trusted Tier

**Monthly Quota**: 55-65 visits  
**Pay Cap**: $15.00/hour (after 6 months if eligible)  
**Badge Concept**: Octagonal badge with three-tone design (trust demonstrated)

**Eligibility**:
- Service Reliability Score: ≥85 (rolling 26-week average)
- Minimum activity: 18 completed visits in rolling 30-day window
- Completion rate: ≥95% (rolling 30-day)
- Timeliness score: ≥90% (rolling 30-day)
- No major professional conduct violations in past 180 days

**Perks**:
- Highest priority booking access (offered before Reliant and Foundation)
- Flexible messaging windows (can message anytime during active assignment periods)
- Priority support with dedicated channel
- Access to mentorship opportunities (paid)
- Reduced oversight (fewer check-ins, more autonomy)
- **Overflow Work Protection**: Declining work beyond quota does not count against acceptance rate
- Holiday multiplier: 1.5x pay on recognized holidays

**Quota Rules**:
- Quota calculated as rolling 30-day average
- Can decline overflow work (beyond 65 visits/month) without penalty
- System-caused low volume excluded

**Pay Raise Eligibility** (every 6 months):
- Service Reliability Score: ≥85 (rolling 26-week average)
- Completion rate: ≥95% (rolling 26-week average)
- Timeliness score: ≥90% (rolling 26-week average)
- No major professional conduct violations
- Raise: +2.5% (capped at $15.00/hour)

---

### Preferred Tier

**Monthly Quota**: 70-80 visits  
**Pay Cap**: $16.25/hour (maximum base pay)  
**Badge Concept**: Star-shaped badge with four-tone design (preferred partner status)

**Eligibility**:
- Service Reliability Score: ≥90 (rolling 26-week average)
- Minimum activity: 25 completed visits in rolling 30-day window
- Completion rate: ≥98% (rolling 30-day)
- Timeliness score: ≥95% (rolling 30-day)
- Visit accuracy score: ≥95% (rolling 30-day)
- No major professional conduct violations in past 365 days

**Perks**:
- Absolute highest priority booking access
- Unlimited messaging windows (can message anytime)
- Priority support with direct line
- Mentorship pay: $15/hour for training new sitters
- Minimal oversight (quarterly check-ins only)
- **Overflow Work Protection**: Declining work beyond quota does not count against acceptance rate
- Holiday multiplier: 2.0x pay on recognized holidays
- Quarterly performance bonus: $200 if all metrics maintained
- First access to new service types and premium clients

**Quota Rules**:
- Quota calculated as rolling 30-day average
- Can decline overflow work (beyond 80 visits/month) without penalty
- System-caused low volume excluded

**Pay Raise Eligibility** (every 6 months):
- Service Reliability Score: ≥90 (rolling 26-week average)
- Completion rate: ≥98% (rolling 26-week average)
- Timeliness score: ≥95% (rolling 26-week average)
- Visit accuracy score: ≥95% (rolling 26-week average)
- No major professional conduct violations
- Raise: +2.5% (capped at $16.25/hour - maximum base pay)

**Post-Cap Compensation**:
Once at $16.25/hour, additional value provided via:
- Quarterly performance bonuses ($200-500 based on metrics)
- Holiday multipliers (2.0x)
- Mentorship pay ($15/hour)
- Priority access to premium bookings (higher rates)
- Reduced oversight (time value)

---

## Fairness Guardrails

### System-Caused Issues (Excluded from Calculations)

1. **Routing Errors**: Incorrect address, missing instructions, GPS failures
2. **Tech Outages**: App crashes, system downtime, payment processing failures
3. **Client Delays**: Client not ready, locked out, emergency situations
4. **Weather Emergencies**: Severe weather warnings, natural disasters
5. **Equipment Failures**: Broken equipment, missing supplies (not sitter's fault)
6. **First-Time Issues**: First visit to new client, unclear instructions

### Quota Flexibility

- **Rolling Averages**: Quotas calculated as rolling 30-day averages, not rigid weekly enforcement
- **Medical Leave**: Approved medical leave excluded from quota calculations
- **Approved Time Off**: Scheduled time off excluded from quota calculations
- **Low Volume Periods**: System-caused low booking volume excluded

### Decline Protection

- **Foundation**: All declines count against acceptance rate (no protection)
- **Reliant+**: Declining overflow work (beyond quota) does not count against acceptance rate
- **System-Caused**: Declines due to system issues excluded from calculations

### Tier Review Process

- **Automatic Review**: Triggered when metrics fall below tier requirements for 2 consecutive 26-week periods
- **Grace Period**: One 26-week grace period for temporary issues (medical, family emergencies)
- **Appeal Process**: Sitters can request tier review with documentation of extenuating circumstances

---

## Dashboard Copy (Neutral, Professional Tone)

### Service Reliability Score Card

**Title**: Service Reliability Score  
**Subtitle**: Calculated weekly using rolling 30-day data

**Score Display**:
```
Your Score: 87/100
Last Updated: [Date]
Status: Active
```

**Category Breakdown**:
```
Responsiveness:        18/20  (90%)
Acceptance & Reliability: 23/25  (92%)
Timeliness:            17/20  (85%)
Visit Accuracy:        19/20  (95%)
Engagement:             9/10  (90%)
Professional Conduct:    5/5   (100%)
```

**Note**: If score is provisional: "Score is provisional due to low activity volume. Complete 8+ visits in a 30-day period for active status."

---

### Tier Status Card

**Title**: Current Tier  
**Subtitle**: [Tier Name] - [Monthly Quota Range]

**Tier Badge**: [Visual badge display]

**Current Status**:
```
Tier: Trusted
Monthly Quota: 55-65 visits
Current Rolling Average: 58 visits
Pay Rate: $14.50/hour
Next Review: [Date]
```

**Eligibility for Next Tier**:
```
Preferred Tier Requirements:
- Service Reliability Score: ≥90 (Current: 87)
- Completion Rate: ≥98% (Current: 95%)
- Timeliness Score: ≥95% (Current: 85%)
- Visit Accuracy Score: ≥95% (Current: 95%)
- Minimum Activity: 25 visits/30 days (Current: 18)
```

**Note**: "Eligibility reviewed every 26 weeks using rolling averages."

---

### Pay Raise Eligibility Card

**Title**: Pay Raise Eligibility  
**Subtitle**: Reviewed every 6 months

**Current Status**:
```
Next Review: [Date]
Current Rate: $14.50/hour
Maximum for Tier: $15.00/hour
```

**Eligibility Requirements**:
```
✓ Service Reliability Score: ≥85 (Current: 87)
✓ Completion Rate: ≥95% (Current: 95%)
✓ Timeliness Score: ≥90% (Current: 85%)
✓ No Major Violations: Yes
```

**Note**: "Raises are 2.5% increments, capped at your tier maximum. After reaching $16.25/hour, additional value is provided through bonuses and perks."

---

### Quota Tracking Card

**Title**: Monthly Quota Progress  
**Subtitle**: Rolling 30-day average

**Current Progress**:
```
Tier Quota: 55-65 visits
Current Average: 58 visits
Status: Within Range
```

**Recent Activity**:
```
Last 30 Days: 58 visits
Last 60 Days: 112 visits (avg: 56)
Last 90 Days: 168 visits (avg: 56)
```

**Note**: "Quota calculated as rolling average. System-caused low volume and approved time off are excluded."

---

### Performance Metrics Card

**Title**: Performance Metrics  
**Subtitle**: Rolling 30-day data

**Key Metrics**:
```
Acceptance Rate: 92% (Target: ≥85%)
Completion Rate: 95% (Target: ≥95%)
On-Time Rate: 85% (Target: ≥90%)
Visit Accuracy: 95% (Target: ≥95%)
Response Time: 3.2 hours (Target: <4 hours)
```

**Trend Indicators**:
- ↑ Improving
- → Stable
- ↓ Declining

**Note**: "Metrics exclude system-caused issues and client delays."

---

## How This Discourages Inefficiency (Implicitly)

### Natural Consequences (Not Stated Explicitly)

1. **Access Reduction**: Lower tiers receive bookings after higher tiers. Inefficient sitters naturally receive fewer opportunities.

2. **Pay Ceiling**: Inefficient performance prevents reaching pay raises. The system doesn't state "you're not getting a raise" - it simply shows eligibility requirements not met.

3. **Quota Gaps**: Sitters below quota see their rolling average, but no warning. The system shows "Current: 45 visits, Quota: 55-65" - the gap is self-evident.

4. **Score Visibility**: Low scores are visible but not highlighted. Sitters see their category breakdowns - low scores in specific areas are obvious without commentary.

5. **Tier Eligibility**: Eligibility requirements are displayed but not enforced with warnings. Sitters see "Current: 87, Required: 90" - the gap speaks for itself.

6. **Overflow Protection**: Higher tiers can decline overflow work. Inefficient sitters at lower tiers cannot decline without impact, creating natural incentive to perform.

### What We Don't Do

- ❌ No "Warning: Your score is low" messages
- ❌ No "You're at risk of tier reduction" notifications
- ❌ No motivational language or emotional appeals
- ❌ No micromanagement or check-in requirements (except Preferred tier quarterly)
- ❌ No rigid weekly quota enforcement
- ❌ No penalties for system-caused issues

### What We Do Instead

- ✅ Show data transparently
- ✅ Display eligibility requirements clearly
- ✅ Let natural consequences (access, pay, perks) shape behavior
- ✅ Provide guardrails for fairness
- ✅ Use rolling averages to smooth temporary issues
- ✅ Reward efficiency with access and compensation

---

## Implementation Notes

### Excel Formulas (For Ops Team)

**Service Reliability Score** (Cell: `B2`):
```
=ROUND(
  (Responsiveness_Score*0.20) +
  (Acceptance_Reliability_Score*0.25) +
  (Timeliness_Score*0.20) +
  (Visit_Accuracy_Score*0.20) +
  (Engagement_Score*0.10) +
  (Professional_Conduct_Score*0.05),
  0
)
```

**Rolling 30-Day Average** (Cell: `C2`):
```
=AVERAGEIFS(
  Visits[Date],
  Visits[Date],">="&TODAY()-30,
  Visits[SitterID],A2
)
```

**Tier Eligibility Check** (Cell: `D2`):
```
=IF(
  AND(
    Service_Reliability_Score>=Tier_Requirements[Min_Score],
    Completion_Rate>=Tier_Requirements[Min_Completion],
    Visits_30Day>=Tier_Requirements[Min_Activity]
  ),
  "Eligible",
  "Not Eligible"
)
```

### Database Schema Considerations

**Tables Needed**:
- `sitter_performance_scores` (weekly snapshots)
- `sitter_tier_history` (tier changes over time)
- `sitter_pay_raises` (raise eligibility and history)
- `performance_events` (individual events for calculations)
- `tier_requirements` (tier definitions and thresholds)

**Key Fields**:
- `service_reliability_score` (0-100)
- `rolling_30day_visits` (calculated)
- `rolling_26week_score` (calculated)
- `current_tier` (enum: foundation, reliant, trusted, preferred)
- `pay_rate` (decimal)
- `next_raise_review_date` (date)
- `next_tier_review_date` (date)

### Dashboard Implementation

**Components Needed**:
1. Service Reliability Score card (with category breakdown)
2. Tier Status card (with eligibility requirements)
3. Pay Raise Eligibility card
4. Quota Tracking card (rolling average)
5. Performance Metrics card (key metrics with trends)

**Data Refresh**:
- Scores: Weekly (Sunday night)
- Tier Reviews: Every 26 weeks
- Pay Raise Reviews: Every 6 months
- Dashboard Data: Real-time (calculated on-demand)

---

## Scalability Considerations

### From 8 to 25+ Sitters

**Current State (8 sitters)**:
- Manual review feasible
- Personal attention possible
- Simple tracking sufficient

**Future State (25+ sitters)**:
- Automated scoring essential
- Tier reviews automated
- Dashboard self-service
- Ops team focuses on exceptions only

**System Design**:
- All calculations automated
- All eligibility checks automated
- Dashboard provides self-service visibility
- Ops team intervenes only for appeals or edge cases

---

## Summary

This system creates a fair, transparent, and scalable performance framework that:

1. **Rewards Efficiency**: Higher performance = better access, pay, and perks
2. **Shapes Behavior**: Natural consequences guide behavior without coercion
3. **Maintains Fairness**: System-caused issues excluded, rolling averages smooth temporary problems
4. **Scales Automatically**: Designed for automation and self-service
5. **Respects Sitters**: Professional, neutral language, no micromanagement
6. **Maintains Business Viability**: Quotas ensure coverage, pay structure is sustainable

The system implicitly discourages inefficiency through access reduction, pay ceilings, and visibility of performance gaps - all without explicit warnings or emotional language.
