# LifePilot AI
### *Think Less. Organize Better. Get Things Done.*

> **Hackathon Category:** Everyday Assistance  
> **Project Repository:** `D:\lifepilot-ai`  
> **Architecture:** Full-Stack Modular AI Orchestration Web Application  

---

## 1. Project Vision

LifePilot AI is a unified intelligent personal assistant that harmonizes three essential aspects of daily life:
1. **Smart Travel Planning & Logistics:** Personalized day-by-day schedules, realistic estimated budget breakdowns (stay, travel, food, activities, misc), packing checklists, and printable travel reports.
2. **AI Project Organization:** Converting raw ideas into structured milestones, actionable tasks, estimated durations, and progress tracking on interactive Kanban boards.
3. **Personal Knowledge Intelligence:** Uploading PDFs, Word documents, and text files to extract executive summaries, answer user questions with source citations, and convert extracted action items directly into persistent tasks.

### The Core Orchestration Loop
```
USER NATURAL REQUEST
       ↓
AI INTENT CLASSIFICATION (TRAVEL | PROJECT | KNOWLEDGE | TASK | GENERAL)
       ↓
SPECIALIZED AI WORKFLOW SERVICE
       ↓
STRUCTURED JSON RESULT & ESTIMATES
       ↓
USER REVIEW & APPROVAL
       ↓
PERSISTENT MONGODB DATABASE RECORD
```

---

## 2. Technologies Used

### Frontend
- **Framework:** ReactJS (Vite 5)
- **Styling:** Tailwind CSS (Dark navy `#0B0F19` & charcoal `#111827` theme with violet `#8B5CF6` and indigo accents)
- **Routing:** React Router DOM (v6 with protected routes and SPA redirects)
- **State Management:** Zustand
- **Icons:** Lucide React
- **Analytics Charts:** Recharts (responsive pie/donut completion charts and bar charts)
- **Markdown Rendering:** React Markdown
- **HTTP Client:** Axios (with request/response interceptors & Bearer token attachment)

### Backend
- **Runtime:** Node.js (v24+) & Express.js
- **Database:** MongoDB Atlas & Mongoose ODM
- **Authentication:** JSON Web Tokens (JWT) & bcryptjs (salted password hashing)
- **Document Processing:** Multer, `pdf-parse` (PDF extraction), `mammoth` (DOCX extraction), text chunking with sliding window & keyword indexing
- **Logging & Utilities:** Morgan, CORS, Dotenv

### AI Providers & Adapter Architecture
- **Primary Provider:** BharatCode API Adapter (documented endpoints & authentication)
- **Fallback Provider:** Google Gemini API Adapter (Gemini 1.5 Flash)
- **Intelligent Demo Mode:** Self-contained, zero-API-key fallback that outputs realistic structured travel plans, project roadmaps, and document summaries clearly marked with `isDemoOutput: true`.

---

## 3. Project Directory Structure

```
D:\lifepilot-ai\
├── client/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   │   ├── Badge.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── EmptyState.jsx
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   └── layout/
│   │   │       ├── AppLayout.jsx
│   │   │       ├── Navbar.jsx
│   │   │       └── Sidebar.jsx
│   │   ├── pages/
│   │   │   ├── Assistant.jsx          # Page 5: Unified AI Assistant
│   │   │   ├── CalendarView.jsx       # Page 15: Timeline / Calendar
│   │   │   ├── Dashboard.jsx          # Page 4: Main Dashboard
│   │   │   ├── DocumentChat.jsx       # Page 13: Document AI Chat
│   │   │   ├── Documents.jsx          # Page 11: Personal Knowledge Hub
│   │   │   ├── DocumentViewer.jsx     # Page 12: Document Viewer
│   │   │   ├── Kanban.jsx              # Page 10: Kanban Task Board
│   │   │   ├── Landing.jsx             # Page 1: Landing Page
│   │   │   ├── Login.jsx               # Page 2: Login
│   │   │   ├── Notifications.jsx       # Page 16: Activity & Notifications
│   │   │   ├── Profile.jsx             # Page 17: User Profile
│   │   │   ├── ProjectDetails.jsx      # Page 9: Project Details & Copilot
│   │   │   ├── Projects.jsx            # Page 8: AI Project Organizer
│   │   │   ├── Register.jsx            # Page 3: Registration
│   │   │   ├── Settings.jsx            # Page 18: Settings
│   │   │   ├── Tasks.jsx               # Page 14: Central Task Manager
│   │   │   ├── TripDetails.jsx         # Page 7: Trip Details & Report
│   │   │   └── Trips.jsx               # Page 6: Smart Trip Planner
│   │   ├── services/
│   │   │   └── api.js                  # Axios client & centralized endpoint bindings
│   │   ├── store/
│   │   │   ├── authStore.js            # Zustand auth state
│   │   │   ├── notificationStore.js    # Notification & badge count state
│   │   │   └── themeStore.js           # Theme toggle state
│   │   ├── App.jsx                     # SPA Route tree
│   │   ├── index.css                   # Tailwind CSS styling & custom scrollbars
│   │   └── main.jsx                    # React entrypoint
│   ├── .env.example
│   ├── package.json
│   ├── tailwind.config.js
│   ├── vercel.json                     # Vercel SPA route rewrite rules
│   └── vite.config.js
│
├── server/
│   ├── uploads/                        # Secured uploaded user documents
│   ├── src/
│   │   ├── config/
│   │   │   ├── db.js                   # Mongoose connection & reconnection handling
│   │   │   └── env.js                  # Environment variable validations
│   │   ├── controllers/
│   │   │   ├── aiController.js         # Chat, intent classification, action approvals
│   │   │   ├── authController.js       # Register, login, profile, me
│   │   │   ├── dashboardController.js  # Aggregated stats & activity feed
│   │   │   ├── documentController.js   # Upload, chunking, summarization, Q&A
│   │   │   ├── notificationController.js# Notifications & read status
│   │   │   ├── projectController.js    # Project roadmap decomposition & AI assistant
│   │   │   ├── taskController.js       # Central task CRUD & status patch
│   │   │   └── tripController.js       # Itinerary generation, reports & CRUD
│   │   ├── middleware/
│   │   │   ├── auth.js                 # JWT verification
│   │   │   ├── errorHandler.js         # Centralized HTTP error handler
│   │   │   └── upload.js               # Multer 15MB file-type validator
│   │   ├── models/
│   │   │   ├── Conversation.js
│   │   │   ├── Document.js
│   │   │   ├── DocumentChunk.js
│   │   │   ├── Message.js
│   │   │   ├── Notification.js
│   │   │   ├── Project.js
│   │   │   ├── Task.js
│   │   │   ├── Trip.js
│   │   │   ├── User.js
│   │   │   └── UserPreference.js
│   │   ├── routes/
│   │   │   ├── ai.routes.js
│   │   │   ├── auth.routes.js
│   │   │   ├── dashboard.routes.js
│   │   │   ├── documents.routes.js
│   │   │   ├── notifications.routes.js
│   │   │   ├── projects.routes.js
│   │   │   ├── tasks.routes.js
│   │   │   └── trips.routes.js
│   │   ├── services/
│   │   │   ├── ai/
│   │   │   │   ├── aiProvider.js       # BharatCode / Gemini / Demo adapter
│   │   │   │   ├── intentClassifier.js # NLP & heuristic intent classification
│   │   │   │   ├── knowledgeAgent.js   # Document intelligence
│   │   │   │   ├── orchestrator.js     # Master orchestration engine
│   │   │   │   ├── projectAgent.js     # Project roadmap planner
│   │   │   │   ├── promptTemplates.js  # Structured JSON prompt schemas
│   │   │   │   └── travelAgent.js      # Travel planning & budget engine
│   │   │   └── documents/
│   │   │       ├── documentChunker.js  # Text chunking & keyword extraction
│   │   │       ├── documentRetriever.js# Keyword & chunk retrieval
│   │   │       ├── docxExtractor.js    # Mammoth DOCX extractor
│   │   │       ├── pdfExtractor.js     # pdf-parse extractor
│   │   │       └── textExtractor.js    # UTF-8 text extractor
│   │   ├── app.js                      # Express app setup & middleware
│   │   ├── server.js                   # Server launcher
│   │   └── test_suite.js               # Verification test suite (23/23 passing)
│   ├── .env.example
│   ├── package.json
│   └── render.yaml                     # Render backend deployment configuration
│
├── package.json                        # Root package scripts
└── README.md                           # Documentation
```

---

## 4. Features Implemented

### Module 1: Unified AI Assistant
- Natural-language interface with conversational history and conversation title auto-generation.
- Backend intent classification detecting `TRAVEL`, `PROJECT`, `KNOWLEDGE`, `TASK`, and `GENERAL`.
- Dynamic Action Proposal Cards: "Save to My Trips", "Create Project & Tasks", "Approve & Add Task".
- User approval required before converting AI recommendations into persistent records.
- Markdown rendering, quick copy to clipboard, and sample prompts.

### Module 2: Smart Trip Planner
- AI itinerary creation with style (Budget, Standard, Luxury), duration, destination, origin, budget, and interests.
- Comprehensive day-wise itinerary with morning, afternoon, evening activities, and recommended dining.
- Categorized budget breakdown: Transportation, Accommodation, Food, Activities, Miscellaneous.
- Explicit non-booking estimate disclaimer notice.
- Interactive packing checklist and pre-trip preparation checklist.
- Natural-language itinerary modifications and printable travel reports.

### Module 3: AI Project Organizer
- Natural-language idea-to-roadmap decomposition into phases and milestones.
- Actionable task generation with estimated durations, priority tags, and day offsets.
- Real-time progress percentage calculated dynamically from associated tasks.
- Dedicated AI Project Copilot answering: "What should I work on today?", "Which tasks are blocking progress?", and "Summarize progress".

### Module 4: Personal Knowledge Hub
- Secure multi-format document upload (PDF, DOCX, TXT) with 15MB size protection.
- Content chunking into manageable pieces with page and keyword indexing.
- Executive summaries, detailed analysis, key findings, important dates, and key entities.
- 1-click conversion of extracted document action items into Central Tasks.
- Dedicated Document AI Chat with chunk source references and citations.

### Module 5: Central Task Manager & Kanban
- Unified task repository linking tasks to their origin (`PROJECT`, `TRIP`, `DOCUMENT`, `AI_ASSISTANT`, `MANUAL`).
- Interactive Kanban Board with columns for "To Do", "In Progress", and "Completed" with one-click status transitions.
- Multi-dimensional filtering by priority, status, origin, and keyword search.

### Module 6: Dashboard & Activity Log
- Aggregated real-time metrics for trips, projects, tasks, and documents.
- Real Recharts charts: Task completion donut chart and priority distribution bar chart.
- Upcoming deadlines alert widget and live activity log.

---

## 5. Environment Variables Configuration

### Backend (`server/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/lifepilot
JWT_SECRET=lifepilot_hackathon_super_secret_jwt_2026
JWT_EXPIRES_IN=7d
AI_PROVIDER=auto
BHARATCODE_API_KEY=your_bharatcode_key_here
BHARATCODE_BASE_URL=https://api.bharatcode.org/v1
GEMINI_API_KEY=your_gemini_key_here
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=./uploads
MAX_FILE_SIZE_MB=15
```

### Frontend (`client/.env`):
```env
VITE_API_URL=http://localhost:5000/api
```

---

## 6. How to Run Locally

### Prerequisites
- Node.js v18+ (tested on v24)
- npm or pnpm
- MongoDB (local `mongod` or free MongoDB Atlas cluster URI)

### Quick Start (2 Terminals)

**Terminal 1 – Backend:**
```bash
cd D:\lifepilot-ai\server
npm install
npm run dev
```
*Backend runs on `http://localhost:5000` (Health check at `http://localhost:5000/api/health`).*

**Terminal 2 – Frontend:**
```bash
cd D:\lifepilot-ai\client
npm install
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

### Running the Automated Test Suite:
```bash
cd D:\lifepilot-ai\server
node src/test_suite.js
```

---

## 7. REST API Endpoints

### Authentication
- `POST /api/auth/register` – Register new user
- `POST /api/auth/login` – Authenticate user and receive JWT
- `GET /api/auth/me` – Retrieve authenticated user profile & preferences
- `PUT /api/auth/profile` – Update user name, bio, or theme

### Unified AI Orchestration
- `POST /api/ai/chat` – Process user natural query with intent classification & workflow routing
- `POST /api/ai/classify` – Standalone intent classification
- `GET /api/ai/conversations` – List user conversations
- `GET /api/ai/conversations/:id/messages` – List messages for a conversation
- `DELETE /api/ai/conversations/:id` – Delete a conversation
- `POST /api/ai/action/approve` – User approval to persist proposed trip, project, or task

### Trips
- `POST /api/trips/generate` – AI trip generation
- `POST /api/trips` – Save trip
- `GET /api/trips` – List user trips
- `GET /api/trips/:id` – Get trip details
- `PUT /api/trips/:id` – Update trip itinerary or checklists
- `DELETE /api/trips/:id` – Delete trip
- `GET /api/trips/:id/report` – Retrieve printable report data

### Projects
- `POST /api/projects/generate` – AI project roadmap generation
- `POST /api/projects` – Create project and initial tasks
- `GET /api/projects` – List projects with real-time progress percentages
- `GET /api/projects/:id` – Get project details & linked tasks
- `PUT /api/projects/:id` – Update project
- `DELETE /api/projects/:id` – Delete project & linked tasks
- `POST /api/projects/:id/query` – AI Project Copilot query

### Tasks
- `POST /api/tasks` – Create new task
- `GET /api/tasks` – List tasks with filters (`status`, `priority`, `originType`, `search`)
- `PUT /api/tasks/:id` – Update full task
- `PATCH /api/tasks/:id/status` – Update task status (`To Do`, `In Progress`, `Completed`)
- `DELETE /api/tasks/:id` – Delete task

### Documents
- `POST /api/documents/upload` – Multipart upload & AI chunking / summarization
- `GET /api/documents` – List user documents
- `GET /api/documents/:id` – Get document metadata & sample chunks
- `POST /api/documents/:id/summarize` – Re-summarize document
- `POST /api/documents/:id/ask` – Contextual Q&A with source citations
- `POST /api/documents/:id/convert-action` – Convert action item to task
- `DELETE /api/documents/:id` – Delete document & chunks

### Dashboard & Notifications
- `GET /api/dashboard/stats` – Aggregated statistics & chart data
- `GET /api/dashboard/activity` – Recent notification log
- `GET /api/notifications` – List notifications with unread count
- `PATCH /api/notifications/:id/read` – Mark single notification read
- `PATCH /api/notifications/mark-all-read` – Mark all notifications read
- `GET /api/health` – System & database health status

---

## 8. Verification Results

Running `node src/test_suite.js` yields **100% test pass rate (23/23 tests)**:
```
====================================================
🧪 RUNNING LIFEPILOT AI VERIFICATION SUITE
====================================================
✅ [PASS] Scenario 1 Intent: "Plan a 5-day Goa trip for four friends under ₹15,000 per person." -> Expected TRAVEL, Got: TRAVEL
✅ [PASS] Travel Agent executed successfully
✅ [PASS] Generated 5-day itinerary (got 5 days)
✅ [PASS] Budget breakdown matches requested total
✅ [PASS] Per-person budget calculation matches (₹15,000/person)
✅ [PASS] Packing checklist generated with items
✅ [PASS] Budget contains standard estimate notice without live booking claim
✅ [PASS] Scenario 2 Intent: "Help me build a college website in 10 days." -> Expected PROJECT, Got: PROJECT
✅ [PASS] Project Agent executed successfully
✅ [PASS] Project has milestones (got 4)
✅ [PASS] Project generated actionable tasks (got 6)
✅ [PASS] Project generated signoff checklist
✅ [PASS] Document Chunking created multiple chunks (got 10)
✅ [PASS] Chunk contains character length metadata
✅ [PASS] Knowledge Agent generated document summary
✅ [PASS] Short summary is present
✅ [PASS] Action items were extracted for task conversion
✅ [PASS] Scenario 4 Intent: "Create a task to complete my database design by tomorrow." -> Expected TASK, Got: TASK
✅ [PASS] Orchestrator routed travel query to TRAVEL intent
✅ [PASS] Orchestrator suggested SAVE_TRIP action with structured data
✅ [PASS] Orchestrator returned structured data payload
✅ [PASS] Bcrypt password hashing and verification verified
✅ [PASS] JWT generation and verification verified
====================================================
RESULTS: 23/23 TESTS PASSED (100%)
====================================================
```

---

## 9. Deployment Instructions

### Frontend (Vercel)
1. Push the repository to GitHub.
2. In Vercel, click **Add New Project** and select the repository.
3. Set **Root Directory** to `client`.
4. Framework Preset: **Vite**.
5. Build Command: `npm run build` (Output Directory: `dist`).
6. Set Environment Variable: `VITE_API_URL` pointing to your deployed backend URL (e.g. `https://lifepilot-backend.onrender.com/api`).
7. Deploy. `client/vercel.json` already contains the SPA rewrite rule (`/(.*) -> /index.html`).

### Backend (Render)
1. In Render, select **New Web Service** and link the repository.
2. Root Directory: `server`.
3. Environment: **Node**.
4. Build Command: `npm install`.
5. Start Command: `node src/server.js`.
6. Set Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `10000`
   - `MONGODB_URI`: `<Your MongoDB Atlas Connection String>`
   - `JWT_SECRET`: `<Secure random 32+ character string>`
   - `CLIENT_URL`: `<Your Vercel deployment URL>`
   - `AI_PROVIDER`: `auto`
   - `BHARATCODE_API_KEY`: `<Your BharatCode API key>`
   - `GEMINI_API_KEY`: `<Your Gemini API key>`
7. Deploy. Health check endpoint is available at `/api/health`.

### Database (MongoDB Atlas)
1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write credentials.
3. Whitelist Network Access (`0.0.0.0/0` for cloud deployment).
4. Copy the SRV URI (e.g., `mongodb+srv://<user>:<password>@cluster0.abcde.mongodb.net/lifepilot?retryWrites=true&w=majority`) into `MONGODB_URI`.

---

## 10. Limitations & Unfinished Scope
- Real-time flight and hotel booking is deliberately non-functional: All generated travel numbers are labeled as estimates to ensure user safety and compliance.
- Semantic vector embeddings for document retrieval: Currently utilizes sliding window chunking with keyword and phrase frequency scoring. Upgrading to MongoDB Vector Search with OpenAI/Gemini embeddings can be introduced in a future release.
- OCR for image-based scanned PDFs: Text-based PDFs and DOCX files extract text directly; scanned images inside PDFs currently require Tesseract OCR enabled.

