# GoalFlow

GoalFlow is a full-stack productivity and execution platform designed to help users transform long-term goals into structured, actionable workflows.

The system combines:

* Goal planning
* Task management
* Dependency-aware execution
* Time scheduling
* Milestone tracking
* Event-driven observability

GoalFlow is built with a strong focus on:

* Domain invariants
* Workflow correctness
* Event-driven architecture
* Maintainable backend design
* Scalable testing infrastructure

---

# Core Features

## Authentication & Users

* JWT-based authentication
* Secure password hashing with bcrypt
* User signup and login flows
* Ownership-based authorization
* Immutable user identity invariants

## Goals

* Create and manage long-term goals
* Deadline tracking
* User-owned goal isolation
* Cascading workflow organization

## Tasks

* CRUD task management
* Task status lifecycle management
* Dependency graphs between tasks
* Completion invariants
* Blocking dependency enforcement
* Circular dependency prevention
* Cross-goal dependency protection
* Soft deletion support

## Scheduling

* Schedule blocks for focused execution
* Overlap prevention
* Dependency-aware scheduling
* Schedule completion lifecycle
* Mutable vs immutable schedule state enforcement
* Scheduling conflict detection

## Milestones

* Goal milestone grouping
* Sequence-based milestone organization
* Goal-scoped milestone validation

## Event Logging

* Append-only audit/event log architecture
* Event-driven observability
* Lifecycle event tracking across modules
* Structured metadata payloads
* Future analytics support

---

# Tech Stack

## Backend

* TypeScript
* NestJS
* Prisma ORM
* PostgreSQL
* JWT Authentication

## Testing

* Jest
* Supertest
* End-to-end workflow testing
* Invariant-focused integration tests

---

# Architecture Philosophy

GoalFlow is designed around explicit business invariants.

Instead of embedding business rules directly inside controllers or repositories, rules are isolated into dedicated invariant layers.

Examples:

* Task completion rules
* Dependency validation
* Schedule overlap protection
* Status transition enforcement
* Cross-goal relationship validation

This architecture provides:

* Better maintainability
* Easier testing
* Stronger workflow correctness
* Clear domain boundaries
* Safer future scaling

---

# Current Backend Architecture

```text
Controller
  ↓
Service (workflow orchestration)
  ↓
Invariant Layer (business rules)
  ↓
Repository Layer
  ↓
Prisma / PostgreSQL
```

---

# Example Domain Invariants

## Task Invariants

* Tasks cannot be completed through generic updates
* Invalid task status transitions are rejected
* Tasks cannot complete with unresolved dependencies
* Cross-goal dependencies are forbidden
* Circular dependencies are prevented
* Tasks with active dependents cannot be deleted

## Scheduling Invariants

* Schedule blocks cannot overlap
* Completed schedule blocks become immutable
* Invalid time ranges are rejected
* Completed tasks cannot be scheduled
* Schedule completion is dependency-aware

## User/Auth Invariants

* Email is required and validated
* User email is immutable
* Password strength requirements enforced
* Invalid credentials rejected consistently

---

# Testing Strategy

GoalFlow emphasizes workflow-focused end-to-end testing.

The project currently includes:

* Reusable E2E test helpers
* Cross-module workflow validation
* Dependency chain testing
* Invariant enforcement testing
* Authorization and ownership testing
* Scheduling lifecycle testing

Example workflows tested:

* Task dependency chains
* Circular dependency rejection
* Schedule overlap rejection
* Task deletion cascading behavior
* Completion lifecycle enforcement

---

# Work In Progress

The following systems are currently under active development:

## Advanced Scheduling Engine

* Automatic task scheduling
* Intelligent rescheduling
* Schedule optimization heuristics
* Priority-aware execution planning

## Milestone Expansion

* Milestone progress tracking
* Milestone completion propagation
* Milestone analytics

## Event-Driven Analytics

* Productivity analytics
* Execution insights
* Time estimation accuracy metrics
* Dependency bottleneck detection

## Soft Delete Infrastructure

* Full archival lifecycle support
* Historical querying
* Recoverable entities

## Background Processing

* Async workflow processing
* Queue-based event handling
* Notification/event consumers

---

# Planned Future Features

## AI-Assisted Planning

* Intelligent task decomposition
* Priority recommendations
* Schedule optimization suggestions
* Goal planning assistance

## Calendar Integrations

* Google Calendar integration
* Outlook integration
* External scheduling sync

## Real-Time Collaboration

* Shared goals
* Team workflows
* Collaborative scheduling
* Shared milestones

## Notifications

* Deadline reminders
* Dependency completion notifications
* Schedule alerts
* Execution risk warnings

## Analytics Dashboard

* Productivity metrics
* Goal progress visualization
* Execution heatmaps
* Time tracking insights

## Mobile Support

* Native mobile applications
* Offline scheduling
* Push notifications

---

# Repository Structure

```text
src/
├── auth/
├── users/
├── goals/
├── tasks/
├── scheduling/
├── milestones/
├── event-log/
├── prisma/
└── common/

test/
├── tasks.e2e-spec.ts
├── scheduling.e2e-spec.ts
└── utils/
```

---

# Running the Project

## Install Dependencies

```bash
npm install
```

## Start Development Server

```bash
npm run start:dev
```

## Run Prisma Migrations

```bash
npx prisma migrate dev
```

## Run Tests

```bash
npm run test
```

## Run E2E Tests

```bash
npm run test:e2e
```

---

# Design Priorities

GoalFlow prioritizes:

1. Correctness over premature optimization
2. Explicit domain rules over hidden behavior
3. Workflow integrity over CRUD simplicity
4. Scalable architecture over short-term convenience
5. Testability as a first-class concern

---

# Status

GoalFlow is currently in active development.

The backend architecture, invariant system, workflow engine, and end-to-end testing foundation are operational and continuing to evolve toward a production-ready execution platform.