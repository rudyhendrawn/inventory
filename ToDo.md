# Inventory System - Technical Debt & Improvement Roadmap

## 1. Code Architecture & Organization

### Missing Core Components
- [ ] No Pydantic schemas for request/response validation in `schemas/`
- [ ] Missing domain services - business logic is scattered in routers
- [ ] No repository pattern - direct SQL queries in controllers
- [ ] Incomplete error handling - minimal validation and error responses

## 2. Database Layer Issues

### Current Problems
- [ ] Mixed connection handling - both `db/pool.py` and `db/connection.py` exist
- [ ] No transaction management for complex operations
- [ ] SQL injection risk - while parameterized, could be improved with query builder

## 3. Security & Authentication

### Current Issues
- [ ] Hardcoded credentials in `.env` file
- [ ] Missing input validation - direct dict usage in `app/routers/items.py`
- [ ] No rate limiting or request size limits
- [ ] CORS too permissive - allows all origins

## 4. Configuration Management

### Issues
- [ ] Sensitive data in version control - `.env` should be `.env.example`
- [ ] Missing environment-specific configs
- [ ] No secrets management

## 5. Error Handling & Logging

### Missing
- [ ] Structured logging configuration
- [ ] Global exception handlers
- [ ] Request/response logging
- [ ] Health check improvements

## 6. Testing Infrastructure

### Completely Missing
- [ ] Unit tests
- [ ] Integration tests
- [ ] Test database setup
- [ ] API endpoint tests

## 7. API Documentation & Validation

*To be documented*

## 8. Deployment & Operations

### Missing
- [ ] Docker containerization
- [ ] Database migrations (Alembic setup incomplete)
- [ ] Environment health checks
- [ ] Monitoring endpoints

## 9. Database Schema Issues

### Problems in `inventory_ddl.sql`
- [ ] Missing indexes for common queries
- [ ] No data validation constraints
- [ ] Missing audit timestamps on some tables

## 10. Priority Implementation Order

### Immediate (Week 1)
- [ ] Add Pydantic schemas for request/response validation
- [ ] Fix security issues (remove `.env` from git, proper CORS)
- [ ] Add basic error handling

### Short-term (Week 2-3)
- [ ] Implement repository pattern
- [ ] Add domain services
- [ ] Set up proper testing framework

### Medium-term (Month 1)
- [ ] Add comprehensive logging
- [ ] Implement database migrations
- [ ] Add monitoring and health checks

### Long-term (Month 2+)
- [ ] Add caching layer
- [ ] Implement audit logging
- [ ] Add backup automation