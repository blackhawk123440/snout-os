# Deviation Backlog

**Date Created**: 2024-12-30  
**Purpose**: Track missing features from Master Spec that are deferred or partially implemented

---

## Backlog Items

### 1. Arrival Event Support Plus Template
**Master Spec Reference**: Section 6.3.1  
**Priority**: Medium  
**Status**: Not Started  
**Type**: Feature Addition

**Description**:
- Implement booking arrival event tracking infrastructure
- Create arrival automation template
- Support arrival status/event in booking status model
- Trigger automations on arrival event

**Requirements**:
- Schema changes for arrival event tracking
- Event emitter for arrival events
- Automation template for arrival notifications
- Integration with booking status system

**Dependencies**: None  
**Estimated Complexity**: Medium

---

### 2. Departure Event Support Plus Template
**Master Spec Reference**: Section 6.3.1  
**Priority**: Medium  
**Status**: Not Started  
**Type**: Feature Addition

**Description**:
- Implement booking departure event tracking infrastructure
- Create departure automation template
- Support departure status/event in booking status model
- Trigger automations on departure event

**Requirements**:
- Schema changes for departure event tracking
- Event emitter for departure events
- Automation template for departure notifications
- Integration with booking status system

**Dependencies**: None  
**Estimated Complexity**: Medium

---

### 3. Key Pickup Reminder Alignment
**Master Spec Reference**: Section 6.3.1  
**Priority**: Low  
**Status**: Not Started  
**Type**: Feature Alignment

**Description**:
- Master spec requires "key pickup reminder" template
- Current implementation has "night-before-reminder" which covers similar use case
- Align implementation to match spec requirement exactly OR document that night-before covers this need

**Requirements**:
- Review use case differences between key pickup reminder and night-before reminder
- Either implement dedicated key pickup reminder template OR document equivalence
- Update template library if needed

**Dependencies**: None  
**Estimated Complexity**: Low

---

### 4. Impersonation with Audit Trail
**Master Spec Reference**: Section 12.2.5  
**Priority**: Low  
**Status**: Not Started  
**Type**: Security Feature

**Description**:
- Implement user impersonation feature for admin/owner users
- Full audit trail of impersonation sessions
- Security controls and permissions
- Session tracking for impersonated sessions

**Requirements**:
- Impersonation API endpoint
- Permission checks (admin/owner only)
- Audit logging for all impersonation actions
- Session management for impersonated users
- UI for impersonation controls

**Dependencies**: Session management (completed)  
**Estimated Complexity**: High (security-sensitive)

---

### 5. Conditions Builder UI
**Master Spec Reference**: Section 6.3.2  
**Priority**: Medium  
**Status**: Not Started  
**Type**: UI Enhancement

**Description**:
- Visual conditions builder UI for automation creation
- Support all condition types: booking status, service type, client tags, sitter tier, payment status, time windows
- Drag-and-drop or form-based builder
- Real-time validation

**Requirements**:
- UI component for condition building
- Support for all condition operators (equals, notEquals, contains, greaterThan, lessThan, in)
- Support for condition logic (AND/OR)
- Integration with automation creation flow

**Dependencies**: Automation templates (completed)  
**Estimated Complexity**: Medium-High

---

### 6. Action Library Expansion
**Master Spec Reference**: Section 6.3.3  
**Priority**: Medium  
**Status**: Not Started  
**Type**: Feature Expansion

**Sub-items**:
- **6a. Create Task Action**: Allow automations to create tasks
- **6b. Add Fee Action**: Allow automations to add fees to bookings
- **6c. Apply Discount Action**: Allow automations to apply discounts
- **6d. Change Status Action**: Allow automations to change booking status
- **6e. Schedule Follow Up Action**: Allow automations to schedule follow-up automations

**Description**:
- Expand automation action library beyond SMS and notifications
- Implement task creation system
- Implement fee/discount application actions
- Implement status change automation
- Implement follow-up scheduling

**Requirements**:
- Task model and API
- Fee/discount application logic
- Status change automation execution
- Follow-up scheduling system
- Integration with automation executor

**Dependencies**: Automation executor (completed)  
**Estimated Complexity**: High

---

### 7. Email Action (Optional Later)
**Master Spec Reference**: Section 6.3.3 (marked as optional)  
**Priority**: Low  
**Status**: Not Started  
**Type**: Feature Addition (Optional)

**Description**:
- Implement email sending action for automations
- Email template support
- Email provider integration
- Email delivery tracking

**Requirements**:
- Email provider integration (e.g., SendGrid, AWS SES)
- Email template system
- Email sending action in automation executor
- Email delivery status tracking

**Dependencies**: Automation executor (completed)  
**Estimated Complexity**: Medium  
**Note**: Marked as "optional" in spec - lower priority

---

## Priority Ranking

Based on pain and revenue safety:

1. **Conditions Builder UI** (Sprint C) - Enables true plug-and-play automations
2. **Action Library Expansion** (Sprint C) - Core actions: fee, discount, status change
3. **Arrival Event Support** (Sprint D) - Elite client experience
4. **Departure Event Support** (Sprint D) - Elite client experience
5. **Key Pickup Reminder Alignment** (Sprint D) - Low priority alignment
6. **Impersonation with Audit Trail** (Sprint E) - Security-sensitive, do last
7. **Email Action** (Future) - Optional, lowest priority

---

## Sprint Planning

### Sprint A: Pricing Unification (Already Complete)
**Status**: ✅ Complete  
**Focus**: Revenue truth

### Sprint B: Automation Settings Persistence (Already Complete)
**Status**: ✅ Complete  
**Focus**: Operational pain

### Sprint C: Conditions Builder UI + Action Library Core
**Priority**: High  
**Items**:
- Conditions Builder UI (#5)
- Action Library: Fee, Discount, Status Change (#6b, #6c, #6d)

### Sprint D: Arrival/Departure Events + Templates
**Priority**: Medium  
**Items**:
- Arrival Event Support + Template (#1)
- Departure Event Support + Template (#2)
- Key Pickup Reminder Alignment (#3)

### Sprint E: Impersonation
**Priority**: Low  
**Items**:
- Impersonation with Audit Trail (#4)

### Future: Email Action
**Priority**: Low (Optional)  
**Items**:
- Email Action (#7)

---

**Last Updated**: 2024-12-30

