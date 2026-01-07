# Inventory System - Technical Debt & Improvement Roadmap

## 1. Code Architecture & Organization

### Missing Core Components
- [x] ~~No Pydantic schemas for request/response validation in `schemas/`~~
- [x] ~~Missing domain services - business logic is scattered in routers~~
- [x] ~~No repository pattern - direct SQL queries in controllers~~
- [x] ~~Incomplete error handling - minimal validation and error responses~~

## 2. Database Layer Issues

### Current Problems
- [x] ~~Mixed connection handling - both `db/pool.py` and `db/connection.py` exist~~
- [x] ~~No transaction management for complex operations~~
- [ ] SQL injection risk - while parameterized, could be improved with query builder

## 3. Security & Authentication

### Current Issues
- [ ] Hardcoded credentials in `.env` file
- [x] ~~Missing input validation - direct dict usage in `app/routers/items.py`~~
- [ ] CORS for internal network only

## 4. Configuration Management

### Issues
- [ ] Sensitive data in version control - `.env` should be `.env.example`
- [x] ~~Missing environment-specific configs~~
- [ ] No secrets management

## 5. Error Handling & Logging

### Missing
- [x] ~~Structured logging configuration~~
- [ ] Global exception handlers
- [x] ~~Request/response logging~~
- [x] ~~Health check improvements~~

## 6. Testing Infrastructure

### Completely Missing
- [ ] Integration tests
- [ ] Test database setup
- [x] ~~API endpoint tests~~

## 7. API Documentation & Validation

*To be documented*

## 8. Deployment & Operations

### Missing
- [x] ~~Environment health checks~~
- [ ] Monitoring endpoints

## 9. Database Schema Issues

### Problems in `inventory_ddl.sql`
- [ ] Missing indexes for common queries
- [x] ~~No data validation constraints~~
- [ ] Missing audit timestamps on some tables

## 10. Priority Implementation Order

### Immediate (Week 1)
- [x] ~~Add Pydantic schemas for request/response validation~~
- [x] ~~Fix security issues (remove `.env` from git, proper CORS)~~
- [x] ~~Add basic error handling~~

### Short-term (Week 2-3)
- [x] ~~Implement repository pattern~~
- [x] ~~Add domain services~~
- [ ] Set up proper testing framework

### Medium-term (Month 1)
- [x] ~~Add comprehensive logging~~
- [ ] Implement database migrations
- [x] ~~Add monitoring and health checks~~

### Long-term (Month 2+)
- [ ] Implement audit logging
- [ ] Add backup automation

---
# Frontend Refactoring Checklist: Bootstrap → Tailwind CSS

## Phase 0: Setup (Complete First)
- [ ] `npm install -D tailwindcss postcss autoprefixer`
- [ ] `npm install lucide-react`
- [ ] `npx tailwindcss init -p`
- [ ] Create `tailwind.config.ts`
- [ ] Update `src/index.css` with Tailwind directives
- [ ] Keep Bootstrap installed (for gradual migration)
- [ ] Update `package.json` scripts (add build step)

## Phase 1: Shared UI Components (Week 1)
- [ ] Create `src/components/UI/` folder
- [ ] Migrate `Button.tsx`
- [ ] Migrate `Card.tsx` + `CardHeader`, `CardBody`, `CardFooter`
- [ ] Migrate `Badge.tsx`
- [ ] Migrate `Alert.tsx`
- [ ] Migrate `Modal.tsx`
- [ ] Migrate `Spinner.tsx`
- [ ] Migrate `Pagination.tsx`
- [ ] Migrate `Form.tsx` (FormGroup, FormControl, FormLabel, FormSelect, FormCheck)
- [ ] Create icon mapping for `lucide-react`
- [ ] Test all components in Storybook (optional)

## Phase 2: Simple List Pages (Week 2)
- [ ] `CategoryPage.tsx` ⭐ START HERE (simplest)
- [ ] `UnitPage.tsx`
- [ ] `UsersPage.tsx`
- [ ] `ItemsPage.tsx`
- [ ] Test search, filter, pagination on each

## Phase 3: Layout & Navigation (Week 2)
- [ ] `Layout.tsx` (sidebar + responsive)
- [ ] Remove `Layout.css` (move to Tailwind)
- [ ] Test desktop & mobile navigation
- [ ] Verify sub-menu collapse/expand

## Phase 4: Form Pages (Week 3)
- [ ] `CategoryPage.tsx` modal (if not done in Phase 2)
- [ ] `UnitPage.tsx` modal (if not done in Phase 2)
- [ ] `ItemFormPage.tsx`
- [ ] `IssueFormPage.tsx`
- [ ] `UserFormPage.tsx`
- [ ] `SettingsPage.tsx`

## Phase 5: Complex Pages (Week 3)
- [ ] `Dashboard.tsx` (statistics + table)
- [ ] `IssueDetailsPage.tsx`
- [ ] `TransactionsPage.tsx`
- [ ] `TransactionFormPage.tsx`

## Phase 6: Polish & Cleanup (Ongoing)
- [ ] Remove Bootstrap imports
- [ ] Remove unused CSS files
- [ ] Update `main.tsx` (remove Bootstrap CSS)
- [ ] Optimize Tailwind bundle
- [ ] Test all responsive breakpoints
- [ ] Cross-browser testing
- [ ] Performance audit

## Phase 7: Deployment
- [ ] Merge to staging branch
- [ ] Full QA testing
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Remove Bootstrap from `package.json`

---

## Migration Priority

1. **High Priority** (do first): CategoryPage, UnitPage, Layout
2. **Medium Priority**: ItemsPage, UsersPage, Forms
3. **Low Priority**: Dashboard, IssueDetails (most complex)

## Notes
- Keep Bootstrap installed during migration
- Can run both Bootstrap and Tailwind simultaneously
- Test each component after migration
- Commit frequently with small PRs