# Workspace Instructions

## Operational Mandates
- **Never run development/application servers in the background**: Do not run `npm run dev`, `next dev`, or other server startup commands in the background (e.g., with `is_background: true`). This ensures there are no port conflicts (`EADDRINUSE`) or orphaned background processes holding ports. Always let the user manage server instances or run them only for transient, non-background operations.
- **Do not inspect or modify Go code**: You must strictly stay within the frontend/console workspace (this Next.js repository). Do not navigate into, search, read, or modify any Go backend code or other backend-related repositories.
- **OpenAPI Spec as sole source of truth**: For any API endpoints, request/response structures, and query parameters, rely strictly and exclusively on the OpenAPI specification files. Do not look at Go source code or any other backend logic to understand the backend APIs.
- **Black-Box API interaction only**: Treat the backend entirely as a black box. Your integration must focus purely on making API calls, processing their response outputs, and handling runtime API responses in the frontend.

## OpenAPI Specification
- The OpenAPI specification files are located at `../px0/docs/openapi/**`. Always read and consult these files first to see what APIs are available, their parameters, and their exact request/response schemas, and use them to design and implement client-side features correctly.
