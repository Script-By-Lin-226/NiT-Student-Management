# GEMINI.md
AI Agent Instructions for Building a Full Stack Application

---

# 1. Role of the AI Agent

You are an autonomous AI Software Engineering Agent responsible for designing and building a **production-ready full stack application**.

You must follow:

- clean architecture
- 3-layer backend structure
- strict directory separation
- modular code design
- scalable system practices

You must generate **maintainable, testable, and structured code**.

---

# 2. Architecture Model

The application must follow **Full Stack + 3 Layer Backend Architecture**

Frontend (Presentation Layer)

        |
        | HTTP / REST / GraphQL
        |

Backend API (Business Logic Layer)

        |
        |

Data Access Layer (Repository / ORM)

        |
        |

Database

---

# 3. Technology Stack (Default)

If no technology is specified, use modern industry standards.

Frontend
- Next.js
- TypeScript
- TailwindCSS
- Axios or Fetch API

Backend
- Python FastAPI OR Node.js (Express / NestJS)
- RESTful API
- JWT authentication

Database
- PostgreSQL (preferred)
- Supabase 
- MySQL (acceptable)

ORM
- Prisma
- SQLAlchemy
- TypeORM

*** You can run the commands to initialize if needed ***

---

# 4. Layer Responsibilities

## Presentation Layer (Frontend)

Responsibilities

- UI rendering
- form handling
- client validation
- API requests
- user authentication interface
- initialize the Next JS

Restrictions

- Must NOT contain business logic
- Must NOT access database directly

---

## Business Logic Layer (Backend Services)

Responsibilities

- core application logic
- validation
- workflow processing
- communication with MCP
- communication with external APIs
- initialize the fastapi

---

# 5. MCP Integration (Generic Only)

The system must support **MCP (Model Context Protocol)** integration.

The MCP implementation must remain **generic and configurable**.

Do NOT hardcode any specific MCP server.

Instead create a generic MCP interface.

Directory:

backend/services/mcp/

Example structure:

backend/services/mcp/
- mcp_client
- mcp_router
- mcp_tools
- mcp_context

Responsibilities

- connect to MCP server
- send structured requests
- receive tool responses
- maintain context
- support tool execution

The MCP server configuration must be read from environment variables.

Example environment variables:

MCP_SERVER_URL
MCP_API_KEY
MCP_TIMEOUT

The MCP layer must be isolated and reusable.

---

# 6. External API Integration

External services must be implemented in isolated modules.

Directory:

backend/integrations/

Example structure:

backend/integrations/
- payment_service
- email_service
- ai_service
- storage_service

Rules

- each external API must have its own service module
- implement retry handling
- implement error handling
- log failures

External APIs must never be called directly from controllers.

Controllers must call services.

---

# 7. Project Directory Structure

The AI agent must follow this structure exactly.

project-root/

frontend/
- app
- components
- pages
- services
- hooks
- utils
- styles

backend/

api/
- routes
- controllers

services/
- business
- mcp

repositories/

models/

integrations/

middleware/

core/
- config
- security

database/
- migrations
- seed

shared/
- types
- constants

scripts/

tests/
- unit
- integration
- e2e

docs/

---

# 8. API Design Standards

All APIs must follow REST conventions.

Examples

GET /api/users  
GET /api/users/{id}  
POST /api/users  
PUT /api/users/{id}  
DELETE /api/users/{id}

Standard response format:

{
"success": true,
"data": {},
"error": null
}

Errors must follow structured responses.

---

# 9. Output Rules for Generated Files

The AI agent must always place generated code in the correct directory.

Mapping:

Frontend UI component  
frontend/components/

Frontend API service  
frontend/services/

Backend API route  
backend/api/routes/

Controller  
backend/api/controllers/

Business logic  
backend/services/business/

MCP related logic  
backend/services/mcp/

External API integration  
backend/integrations/

Database models  
backend/models/

Repository code  
backend/repositories/

---

# 10. Environment Variables

All sensitive configuration must use environment variables.
for back end external API and secret key should store in .env and also for front end

Example variables:

DATABASE_URL
JWT_SECRET
MCP_SERVER_URL
MCP_API_KEY
EXTERNAL_API_KEY

Secrets must never be hardcoded.

---

# 11. Security Requirements

The application must implement

JWT authentication

input validation

rate limiting

secure headers

CORS configuration

secure environment variable handling

---

# 12. Logging

Logging must exist for:

API requests

errors

external API failures

MCP communication

Logs should be written using a centralized logging utility.  


---

# 13. Testing Requirements

Testing structure:

tests/

unit/
integration/
e2e/

Testing tools may include:

pytest

jest

supertest

playwright

All core logic must have unit tests.

---

# 14. Documentation

The AI agent must generate documentation inside:

docs/

Required documentation:

architecture overview

API documentation

environment setup

deployment guide


---

# 15. Agent Behavior Rules

Before generating code the AI agent must:

1. design the architecture
2. create the directory structure
3. separate frontend and backend logic
4. isolate MCP integration
5. isolate external APIs
6. write modular services
7. follow the defined directory rules
8. create dir './temporary' and prepare to-do list.md


Never mix layers.

Never bypass services.

Controllers must not contain business logic.

---

END OF GEMINI.md