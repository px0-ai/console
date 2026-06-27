# Workspace Instructions

## Operational Mandates
- **Never run development/application servers in the background**: Do not run `npm run dev`, `next dev`, or other server startup commands in the background (e.g., with `is_background: true`). This ensures there are no port conflicts (`EADDRINUSE`) or orphaned background processes holding ports. Always let the user manage server instances or run them only for transient, non-background operations.
