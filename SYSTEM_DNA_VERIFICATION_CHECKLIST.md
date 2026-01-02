# System DNA Verification Checklist (Authoritative)

**Date:** 2025-01-27  
**Status:** Verification in Progress

---

## A. System Governance

- [ ] All pages use AppShell with an explicit physiology prop
- [ ] No page defines motion, spacing, or energy rules independently
- [ ] All styling flows through tokens or system components
- [ ] No legacy CSS files or ad-hoc styles influence layout

---

## B. Posture Integrity

- [ ] Every route has exactly one dominant posture
  - [ ] Observational
  - [ ] Analytical
  - [ ] Operational
  - [ ] Configuration
- [ ] No page switches posture dynamically
- [ ] Tabs and subviews do not change posture behavior
- [ ] Posture only affects density, timing, and emphasis—not layout rules

---

## C. State Model (Critical)

- [ ] idle is the default state for all non-primary elements
- [ ] focused is used only for primary actions in observational contexts
- [ ] active is used only for readiness in operational contexts
- [ ] Energy states decay automatically back to idle after 8 seconds
- [ ] No page-level timers or state logic override system behavior

---

## D. Motion Discipline

- [ ] Motion is present but never noticeable as a feature
- [ ] No looping animations
- [ ] No bounce, spring, or playful easing
- [ ] Motion timing matches posture:
  - [ ] Observational: slow
  - [ ] Analytical: moderate
  - [ ] Operational: tight
  - [ ] Configuration: minimal

---

## E. Color Discipline

- [ ] White is the dominant surface everywhere
- [ ] Pink #fce1ef is used only as:
  - [ ] shadow color
  - [ ] subtle energy glow
  - [ ] focus emphasis
- [ ] No decorative pink usage
- [ ] No legacy dark theme remnants

---

## F. Depth and Hierarchy

- [ ] Cards use depth="elevated" consistently
- [ ] Critical errors use depth="critical" only
- [ ] Depth is created via shadow and z-index, not transforms
- [ ] No random elevation values

---

## G. Silence Enforcement

- [ ] Secondary and tertiary actions are visually silent by default
- [ ] Nothing draws attention unless it matters
- [ ] Idle state is intentionally calm
- [ ] Contrast is created by silence, not decoration

---

## H. Regression Guard

- [ ] No old layout classes, components, or containers are rendered
- [ ] No mixed spacing systems exist
- [ ] No duplicated layout primitives
- [ ] Old UI code paths are removed or unreachable

---

## Old Layout Removal Verification

- [ ] Step 1: One layout to rule them all
  - [ ] All routes render through the new AppShell
  - [ ] No legacy layout components remain mounted
  - [ ] No conditional rendering that switches between old and new shells
- [ ] Step 2: Remove legacy styling paths
  - [ ] No legacy CSS files are imported
  - [ ] No global styles override new tokens
  - [ ] No old class names exist in the DOM
- [ ] Step 3: Break the old layout on purpose
  - [ ] Old layout component removed/verified non-functional
  - [ ] App functions without old system
- [ ] Step 4: Lock the new system as canonical
  - [ ] Rule/documentation exists: AppShell + System DNA is sole supported layout system

---

**If any item fails, the system is not compliant.**

