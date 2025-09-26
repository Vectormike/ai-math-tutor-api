# AI Math Tutor API

> **Demo Backend Service** - Showcasing Node.js + TypeScript + PostgreSQL + AI Integration

A production-ready backend service that mimics Astra AI's tutoring workflows, built to demonstrate expertise in:
- **Node.js + TypeScript** backend development
- **PostgreSQL** schema design and optimization
- **REST API** architecture with clean validation
- **AI Integration** (OpenAI GPT-4) for step-by-step math solutions
- **Redis Caching** for performance optimization
- **Clean Architecture** with proper separation of concerns

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+
- **PostgreSQL** 13+
- **Redis** 6+ (optional - app works without it)
- **OpenAI API Key** (optional - uses mock responses without it)

### 1. Clone and Install
```bash
git clone <your-repo>
cd ai-math-tutor-api
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your database credentials and OpenAI API key
```

### 3. Database Setup
```bash
# Start PostgreSQL and Redis (using Docker)
docker-compose up postgres redis -d

# Run migrations
npm run migrate

# Seed with sample data
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

🎉 **API is now running at `http://localhost:3000`**

## 📸 API in Action

Here's the API working with different types of math problems:

### Algebra Example
![API Demo - Algebra](api-demo-screenshot.png)

**Request:**
```json
{
  "question": "Solve for x: 3x - 7 = 14",
  "user_id": "5ef0cd6a-b39f-4072-a212-ff7fc40ca72b",
  "question_type": "algebra"
}
```

**Response:**
- ✅ **Clean, step-by-step solution**
- ✅ **Correct final answer (7)**
- ✅ **Educational reasoning for each step**
- ✅ **Fast processing (23.11s response time)**

### Calculus Example
![API Demo - Calculus](api-demo-calculus-screenshot.png)

**Request:**
```json
{
  "question": "Find the derivative of f(x) = x² + 3x - 5",
  "user_id": "5ef0cd6a-b39f-4072-a212-ff7fc40ca72b",
  "question_type": "algebra"
}
```

**Response:**
- ✅ **Complete calculus solution with 5 steps**
- ✅ **Power rule application**
- ✅ **Term-by-term differentiation**
- ✅ **Correct final answer (2x + 3)**
- ✅ **Educational reasoning for each step**

## 🏗️ Architecture

This project demonstrates **clean layered architecture** with proper separation of concerns:

```
src/
├── controllers/     # HTTP request/response handling
├── services/        # Business logic layer
├── repositories/    # Data access layer
├── infrastructure/  # External services (AI, Database, Redis)
├── routes/         # API endpoint definitions
├── validators/      # Input validation schemas
├── types/          # TypeScript interfaces & types
├── database/       # Schema, migrations, connection logic
├── utils/          # Logger and utility functions
└── server.ts       # Express app setup & startup logic
```

### Key Design Decisions

**🎯 Layer Separation**
- **Controllers**: Handle HTTP requests/responses and error formatting
- **Services**: Contain business logic and orchestrate operations
- **Repositories**: Handle data access and database operations
- **Infrastructure**: External service integrations (AI, Database, Redis)
- **Validators**: Input validation and request sanitization
- **Routes**: API endpoint definitions and middleware binding

**⚡ Performance Optimizations**
- **Database Indexes**: Optimized for common query patterns
- **Redis Caching**: Frequently asked questions cached for 1 hour
- **Connection Pooling**: Efficient PostgreSQL connection management
- **Structured Logging**: Performance monitoring and debugging

**🛡️ Production-Ready Features**
- **Input Validation**: Comprehensive request validation using Joi schemas
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Health Checks**: Kubernetes-compatible health endpoints
- **Graceful Shutdown**: Clean resource cleanup on termination
- **AI Fallback**: Ollama integration when OpenAI is unavailable

## 📚 API Documentation

### Base URL: `http://localhost:3000`

### Math Question Endpoints

#### 1. Submit Math Question
**`POST /api/question`**

Submit a math question for AI-powered step-by-step solving.

```bash
curl -X POST http://localhost:3000/api/question \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Solve 2x + 5 = 15 for x",
    "user_id": "123e4567-e89b-12d3-a456-426614174000",
    "question_type": "algebra"
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "question-uuid",
    "question": "Solve 2x + 5 = 15 for x",
    "question_type": "algebra",
    "status": "completed",
    "steps": [
      {
        "step_number": 1,
        "description": "Subtract 5 from both sides",
        "mathematical_expression": "2x + 5 - 5 = 15 - 5",
        "reasoning": "To isolate the term with x, we subtract 5 from both sides"
      },
      {
        "step_number": 2,
        "description": "Simplify",
        "mathematical_expression": "2x = 10",
        "reasoning": "The left side becomes 2x and the right side becomes 10"
      },
      {
        "step_number": 3,
        "description": "Divide both sides by 2",
        "mathematical_expression": "x = 10/2",
        "reasoning": "To solve for x, divide both sides by the coefficient of x"
      },
      {
        "step_number": 4,
        "description": "Final answer",
        "mathematical_expression": "x = 5",
        "reasoning": "10 divided by 2 equals 5"
      }
    ],
    "final_answer": "x = 5",
    "explanation": "This is a linear equation solved by isolating x through inverse operations.",
    "processing_time_ms": 1247,
    "created_at": "2024-01-15T10:30:00.000Z"
  },
  "message": "Question processed successfully"
}
```

#### 2. Get Question & Answer
**`GET /api/question/:id`**

Retrieve a previously submitted question and its AI-generated answer.

```bash
curl http://localhost:3000/api/question/123e4567-e89b-12d3-a456-426614174000
```

#### 3. User Question History
**`GET /api/question/user/:userId/history`**

Get paginated history of a user's questions and answers.

```bash
curl "http://localhost:3000/api/question/user/123e4567-e89b-12d3-a456-426614174000/history?page=1&limit=10"
```

#### 4. Delete Question
**`DELETE /api/question/:id`**

Remove a question and its associated answer.

```bash
curl -X DELETE http://localhost:3000/api/question/123e4567-e89b-12d3-a456-426614174000
```

#### 5. Bulk Ingest Questions
**`POST /api/question/ingest`**

Submit multiple math questions for batch processing.

```bash
curl -X POST http://localhost:3000/api/question/ingest \
  -H "Content-Type: application/json" \
  -d '{
    "questions": [
      {
        "question": "Solve 2x + 5 = 13",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "question_type": "algebra"
      },
      {
        "question": "Find the derivative of x² + 3x - 5",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "question_type": "calculus"
      },
      {
        "question": "What is 15% of 200?",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "question_type": "arithmetic"
      }
    ]
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_questions": 3,
    "successful": 3,
    "failed": 0,
    "results": [
      {
        "question": "Solve 2x + 5 = 13",
        "success": true,
        "question_id": "question-uuid-1",
        "processing_time_ms": 1500
      },
      {
        "question": "Find the derivative of x² + 3x - 5",
        "success": true,
        "question_id": "question-uuid-2",
        "processing_time_ms": 2000
      },
      {
        "question": "What is 15% of 200?",
        "success": true,
        "question_id": "question-uuid-3",
        "processing_time_ms": 1200
      }
    ],
    "processing_time_ms": 3500
  },
  "message": "Bulk ingest completed: 3/3 questions processed successfully"
}
```

### User Management Endpoints

#### 1. Create User
**`POST /api/users`**

Create a new user account.

```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "age": 25
  }'
```

#### 2. Get All Users
**`GET /api/users`**

Retrieve all users with pagination.

```bash
curl "http://localhost:3000/api/users?page=1&limit=10"
```

#### 3. Get User by ID
**`GET /api/users/:id`**

Retrieve a specific user by their ID.

```bash
curl http://localhost:3000/api/users/user-uuid
```

#### 4. Get User by Email
**`GET /api/users/search/email`**

Find a user by their email address.

```bash
curl "http://localhost:3000/api/users/search/email?email=john@example.com"
```

#### 5. Update User
**`PUT /api/users/:id`**

Update user information.

```bash
curl -X PUT http://localhost:3000/api/users/user-uuid \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Smith",
    "age": 26
  }'
```

#### 6. Delete User
**`DELETE /api/users/:id`**

Remove a user account.

```bash
curl -X DELETE http://localhost:3000/api/users/user-uuid
```

### Health & Monitoring

#### Basic Health Check
**`GET /health`**
```bash
curl http://localhost:3000/health
```

#### Detailed System Health
**`GET /health/detailed`**
```bash
curl http://localhost:3000/health/detailed
```

#### System Statistics
**`GET /health/stats`**
```bash
curl http://localhost:3000/health/stats
```

## 🗄️ Database Schema

### Tables

**Users**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Questions**
```sql
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    question_text TEXT NOT NULL,
    question_type VARCHAR(50) NOT NULL DEFAULT 'other',
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

**Answers**
```sql
CREATE TABLE answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES questions(id),
    steps JSONB NOT NULL,
    final_answer TEXT NOT NULL,
    explanation TEXT NOT NULL,
    processing_time_ms INTEGER NOT NULL DEFAULT 0,
    ai_model_used VARCHAR(100) NOT NULL DEFAULT 'gpt-4',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
```

### Key Indexes
- **Full-text search** on question text
- **Composite indexes** for user history queries
- **Performance indexes** on timestamps and foreign keys

## 🚀 Deployment Options

### Docker Compose (Recommended for Development)

**Start everything:**
```bash
docker-compose up -d
```

**Start with admin tools:**
```bash
docker-compose --profile admin up -d
```

**Services included:**
- **API**: `http://localhost:3000`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`
- **PgAdmin**: `http://localhost:8080` (admin/admin123)
- **Redis Commander**: `http://localhost:8081` (admin/admin123)

### Production Docker Build

```bash
# Build production image
docker build -t math-tutor-api .

# Run with environment variables
docker run -d \
  -p 3000:3000 \
  -e DATABASE_URL=postgresql://user:pass@host:5432/db \
  -e REDIS_URL=redis://host:6379 \
  -e OPENAI_API_KEY=your-key \
  math-tutor-api
```

## 🧪 Development

### Available Scripts
```bash
npm run dev          # Start development server with hot reload
npm run build        # Build for production
npm run start        # Start production server
npm run migrate      # Run database migrations
npm run seed         # Seed database with sample data
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
```

### Project Structure
```
ai-math-tutor-api/
├── src/
│   ├── controllers/       # HTTP request/response handling
│   ├── services/         # Business logic layer
│   ├── repositories/     # Data access layer
│   ├── infrastructure/   # External services (AI, DB, Redis)
│   ├── routes/          # API endpoint definitions
│   ├── validators/      # Input validation schemas
│   ├── database/        # Schema, migrations, connection
│   ├── types/           # TypeScript definitions
│   ├── utils/           # Utilities and helpers
│   └── server.ts        # Express app setup
├── docker-compose.yml    # Local development stack
├── Dockerfile           # Production container
└── README.md           # This file
```

## 🔧 Configuration

### Environment Variables

**Required:**
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DB_HOST=localhost
DB_PORT=5432
DB_NAME=math_tutor
DB_USER=postgres
DB_PASSWORD=password

# Server
PORT=3000
NODE_ENV=development
```

**Optional:**
```bash
# AI Integration
OPENAI_API_KEY=sk-...                    # OpenAI API key
OLLAMA_URL=http://localhost:11434        # Ollama service URL
OLLAMA_MODEL=llama3:latest               # Ollama model to use

# Redis Caching
REDIS_URL=redis://localhost:6379        # Redis connection
REDIS_HOST=localhost
REDIS_PORT=6379

# Logging
LOG_LEVEL=info                          # Log verbosity
```

## ⚡ Performance Features

### Caching Strategy
- **Question Caching**: Identical questions cached for 1 hour
- **User History Caching**: User history cached for 5 minutes
- **Cache Miss Handling**: Graceful fallback when Redis unavailable

### Database Optimization
- **Composite Indexes**: Optimized for common query patterns
- **Connection Pooling**: Efficient resource management
- **Query Performance**: Sub-100ms response times for cached queries

### Monitoring & Observability
- **Structured Logging**: JSON logs with request correlation
- **Health Checks**: Kubernetes-compatible endpoints
- **Performance Metrics**: Processing times and system stats

## 🛠️ Tech Stack Highlights

This project showcases modern backend development with **layered architecture**:

✅ **Node.js + TypeScript** - Scalable backend with strict type safety
✅ **PostgreSQL** - Advanced schema design with optimized indexes
✅ **Redis** - Performance caching layer
✅ **Express.js** - Clean, robust API architecture
✅ **OpenAI + Ollama** - AI model integration with fallback support
✅ **Joi Validation** - Comprehensive input validation
✅ **Winston Logging** - Structured logging and monitoring
✅ **Docker** - Containerized development and deployment
✅ **Clean Architecture** - Controller/Service/Repository pattern

## 📋 API Test Examples

### Test with Sample User

First, create a sample user (or use the seeded data):

```bash
# Using seeded data - Alice Johnson
USER_ID="alice-user-id-from-seed-data"

# Submit a question
curl -X POST http://localhost:3000/api/question \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is the derivative of 3x^2 + 2x - 1?",
    "user_id": "'$USER_ID'",
    "question_type": "calculus"
  }'

# Get user history
curl "http://localhost:3000/api/question/user/$USER_ID/history?limit=5"
```

## 🎯 Why This Project

This AI Math Tutor API demonstrates **exactly** what Astra AI is looking for:

1. **System Design Skills**: Clean architecture with proper separation of concerns
2. **Database Expertise**: Optimized PostgreSQL schema with proper indexing
3. **API Design**: RESTful endpoints with comprehensive validation
4. **AI Integration**: OpenAI GPT-4 integration with structured responses
5. **Performance**: Redis caching and query optimization
6. **Production Ready**: Health checks, logging, error handling, Docker

Perfect for demonstrating backend engineering skills in a **tutoring/education context**! 🎓

---

**Built with ❤️ to showcase Node.js + TypeScript + PostgreSQL + AI expertise**
