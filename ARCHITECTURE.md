# Volatile Architecture Guide

## 1. The 10,000-Foot View (System Overview)

### **Core Purpose**
Volatile is a **Fantasy Football League Analyzer** designed to provide advanced insights for Dynasty and Redraft leagues. It aggregates roster data from multiple platforms (**Sleeper** and **Fleaflicker**), normalizes it, and enriches it with market trade values (sourced from FantasyCalc) and calculated metrics (like "Value Gap" and "Trend").

### **System Map**
The application follows a **Serverless-First** architecture, leveraging AWS Lambda for the backend to ensure scalability and cost-efficiency.

```mermaid
graph TD
    User[User / Browser] -->|HTTPS| CF[CloudFront / Amplify]
    CF -->|Serves Static Assets| Client[React Frontend]
    
    Client -->|API Requests| API[API Gateway / Lambda Function URL]
    API -->|Routing| Express[Express Server (Lambda)]
    
    subgraph "Backend Services"
        Express -->|Fetch Roster| Sleeper[Sleeper API]
        Express -->|Fetch Roster| Flea[Fleaflicker API]
        Express -->|Get Values| Cache[In-Memory Cache]
        Cache -.->|Miss/Load| DDB[(AWS DynamoDB: PlayerValues)]
    end
    
    subgraph "Data Pipeline (Python)"
        Python[Python Analysis Scripts] -->|Scrape/Calc| DDB
    end
```

**Data Flow:**
1.  **Ingest**: User requests a league page (e.g., `/league/123`).
2.  **Fetch**: Frontend calls Backend API.
3.  **Aggregate**: Backend fetches raw roster data from Sleeper/Fleaflicker.
4.  **Enrich**: Backend augments raw players with "Player Values" from its internal DynamoDB (via an in-memory cache layer).
5.  **Serve**: Enriched JSON is sent to the Frontend.
6.  **Display**: React processes, sorts, and visualizes the data (e.g., Value Gaps, Age curves).

---

## 2. Stack Breakdown & Framework Specifics

### **Frontend layer**
-   **Framework**: React 18+ (bootstrapped with CRA).
-   **Routing**: `react-router-dom` (v6/v7).
    -   **Strategy**: URL-based state. `/league/:id` and `/fleaflicker/:id` are distinct routes that mount the same core logic but different page wrappers.
    -   **Component Reuse**: `GenericRosterDisplay.jsx` is the heavy lifter, acting as a "Smart Component" that adapts based on the `platform` prop.
-   **Hosting**: AWS Amplify (serves static build).
-   **CI/CD**:
    -   **Pipeline**: Managed by AWS Amplify (`amplify.yml`). Connects to the GitHub repository.
    -   **Build**: Installs dependencies, runs `npm run build`.
    -   **Environment**: Injects `REACT_APP_API_URL` during the build phase using `amplify_outputs.json`.

### **Backend Layer**
-   **Runtime**: Node.js running Express, wrapped in `@vendia/serverless-express` to run on AWS Lambda.
-   **Routing Strategy**:
    -   **Entry Point**: `lambda.js` is the AWS handler, `server.js` is the Express app definition.
    -   **Route Split**:
        -   `/api/sleeper/*` -> `sleeperRosterRoutes.js`, etc.
        -   `/api/fleaflicker/*` -> `fleaflickerRosterRoutes.js`
        -   `/api/enriched-players/*` -> `enrichedPlayerRoutes.js` (Internal Data)
-   **Data Processing**:
    -   Middleware: Standard `cors` and `json` parsing.
    -   Normalization: `nameUtils.js` (`cleanseName`) is critical for linking players across different systems (e.g., "Patrick Mahomes II" vs "Patrick Mahomes").

### **Data Layer**
-   **Database**: AWS DynamoDB (`PlayerValues` table).
    -   **Schema**: Keyed by `sleeper_id` (string). Contains trade values, ranks, and trends.
-   **Persistence**:
    -   **Read-Heavy**: The app is 99% read-heavy.
    -   **Caching**: `playerService.js` implements a singleton **in-memory cache** (`playerMap`). On the first request to a hot Lambda, it scans the *entire* DynamoDB table and keeps it in RAM. This drastically reduces DB costs and latency for subsequent requests.

### **Administrative & Data Pipeline**
-   **Rankings Upload**:
    -   **Frontend**: `AdminPage.jsx` allows uploading `.xlsx` files for Superflex, 1QB, and Redraft rankings.
    -   **Storage**: Files are uploaded to an S3 Bucket via `/api/admin/upload`. Keys are prefixed by category (e.g., `uploads/superflex/`).
-   **Data Processing (Python)**:
    -   **Orchestrator**: `python_analysis/local_data_processor.py` (and corresponding Lambda).
    -   **Logic**:
        1.  Fetches live market values from FantasyCalc API.
        2.  Downloads latest Excel rankings from S3 (1QB and SF).
        3.  Merges datasets using `pandas` on cleansed player names.
        4.  Writes enriched data to **two** DynamoDB tables (Dev and Prod) simultaneously.

---

## 3. Design Patterns & "The Why"

### **1. The Adapter Pattern (Frontend & Backend)**
-   **Implementation**:
    -   **Frontend**: `GenericRosterDisplay` doesn't care if the data came from Sleeper or Fleaflicker. It expects a normalized JSON shape.
    -   **Backend**: `fleaflickerService.js` transforms the chaotic Fleaflicker API response into a clean, uniform object structure that matches what the Sleeper routes output.
-   **Why?**: This allows the UI to be "platform agnostic." Adding a 3rd platform (e.g., MFL) only requires writing a backend adapter, not a new UI.

### **2. The "Read-Through" Singleton Cache**
-   **Implementation**: `server/services/playerService.js` checks `isLoaded`. If false, it scans DynamoDB. If true, it serves from RAM.
-   **Why?**:
    -   **Cost**: DynamoDB charges per read unit. Scanning the table on every API call would be expensive and slow.
    -   **Speed**: RAM access is instant. Since player values don't change by the second, this "stale-while-revalidate" approach (albeit manual) is efficient for this specific use case.

### **3. The "Enrichment" Middleware Pattern**
-   **Implementation**: Routes often follow a `Fetch Raw -> Fetch Values -> Merge` pattern.
-   **Why?**: It keeps the "Roster Fetching" logic separate from the "Value Calculation" logic. The API endpoints for rosters don't just return roster data; they return *enriched* roster data, saving the frontend from making N+1 requests (1 for roster, N for player values).

---

## 4. Brittle Areas & Technical Debt (Code Review)

### **1. `client/src/components/GenericRosterDisplay.jsx` (God Component)**
-   **Issue**: This file is **huge** (~400 lines). It handles fetching, state management, sorting logic, filtering, *and* manual settings (Keepers, PPR, Superflex).
-   **Brittleness**:
    -   If you need to change how sorting works, you risk breaking the fetching logic.
    -   The `useEffect` dependency array is complex and prone to infinite loops if modified carelessly.
-   **Refactor Plan**: Extract the logic into a custom hook: `useRosterData(platform, leagueId, rosterId, settings)`. Move the sorting logic into a pure utility function or a `useSortedRoster` hook.

### **2. `server/routes/enrichedPlayerRoutes.js` (Manual Batching)**
-   **Issue**: The `/batch` endpoint manually chunks requests and uses `Promise.all` with individual `GetCommand` calls (or a hacked-together batch loop).
-   **Brittleness**:
    -   **Scalability**: If you request 5,000 players, this will likely timeout the Lambda or hit DynamoDB throttling limits.
    -   **Error Handling**: If one promise fails in a weird way, it might affect the whole batch or be swallowed silently.
-   **Refactor Plan**: Use the native `BatchGetItem` command properly, handling "UnprocessedKeys" (retries) which the AWS SDK can help with, or switch to a full-table scan cache approach if the dataset is small enough (which it seems to be, given the `playerService` cache).

### **3. `client/src/components/get_rosters.py` (Orphaned Code)**
-   **Issue**: There are Python scripts living inside the React `src/components` folder.
-   **Brittleness**:
    -   **Confusion**: These files are not bundled by Webpack/React. They are dead weight in the production build but confusing for developers.
    -   **Security**: They contain hardcoded URLs and potentially logic that should probably be in the backend.
-   **Refactor Plan**: **Delete them** or move them to the `python_analysis/` directory if they are actually used for local testing. They do not belong in the frontend source tree.

### **4. Security Vulnerability: Unprotected Admin Routes**
-   **Issue**: The `/admin` page and its corresponding API endpoints (`/api/admin/upload`, `/api/admin/process`) have **NO authentication**.
-   **Risk**: Anyone who guesses the URL can upload malicious files to S3 or trigger expensive data processing jobs.
-   **Refactor Plan**: Implement a simple API Key middleware or integrate AWS Cognito/Amplify Auth to protect these routes.

### **5. Hardcoded Configuration (`local_data_processor.py`)**
-   **Issue**: The Python script hardcodes DynamoDB table names (`PlayerValue-5krgd...`) and specific S3 bucket names.
-   **Brittleness**: Breaking changes if the Amplify environment is rebuilt or if you want to deploy to a new stage.
-   **Refactor Plan**: Inject these values via Environment Variables, matching the pattern used in the Node.js backend (`process.env.TABLE_NAME`).

### **6. Testing Gaps**
-   **Issue**: Codebase has minimal test coverage. Frontend has only default smoke tests. Backend has basic tests.
-   **Risk**: Refactoring "God Components" (like `GenericRosterDisplay`) is high-risk without regression tests.
-   **Refactor Plan**: Prioritize adding unit tests for `usePlayerAnalysis` (hook) and `playerService` (backend) before major refactors.
