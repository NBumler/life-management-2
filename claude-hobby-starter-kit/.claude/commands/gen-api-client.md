---
description: Regenerate the Angular API client from the backend OpenAPI spec
allowed-tools: Bash, Read, Glob
---

# Regenerate the OpenAPI Angular client

The frontend API client under `frontend/src/app/api/` is GENERATED from the
backend's OpenAPI spec. Run this after any backend API change. Never hand-edit
the generated files.

## Steps

1. **Locate the spec.** Find the OpenAPI file (commonly
   `backend/src/main/resources/openapi.yaml`, or exported at runtime from
   `http://localhost:8080/v3/api-docs`). If you can't find it, ask me where it is.

2. **Regenerate.** Run the project's generation script (defined in
   `frontend/package.json`, e.g. using `ng-openapi-gen` or `openapi-generator`):
   ```bash
   cd frontend && npm run gen:api
   ```
   If no such script exists yet, tell me — I'll help set one up (recommend
   `ng-openapi-gen` for Angular).

3. **Verify.** Confirm the generated files under `frontend/src/app/api/` changed
   as expected, and that the frontend still builds:
   ```bash
   cd frontend && npm run build
   ```

4. Summarize what endpoints/models changed. Do NOT commit automatically.

$ARGUMENTS
