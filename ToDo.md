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
- [ ] Add comprehensive logging
- [ ] Implement database migrations
- [ ] Add monitoring and health checks

### Long-term (Month 2+)
- [ ] Add caching layer
- [ ] Implement audit logging
- [ ] Add backup automation