---
description: Start the backend and frontend for local development
allowed-tools: Bash
---

# Run the app locally

Start both halves of the monorepo for development. Explain what you're starting,
then run the commands. Do NOT run destructive commands.

## Steps

1. **Backend** (`backend/`): start Spring Boot.
   ```bash
   cd backend && ./gradlew bootRun
   ```
   This is long-running. Note the port (default 8080) from the startup log.

2. **Frontend** (`frontend/`): in a separate process, start Ionic/Angular.
   ```bash
   cd frontend && npm start
   ```
   Default dev server: http://localhost:4200 (or `ionic serve` -> 8100).

3. Tell me both URLs and remind me the frontend proxies API calls to the backend
   (check `frontend/proxy.conf.json` if requests 404).

$ARGUMENTS
