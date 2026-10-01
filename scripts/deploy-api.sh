#!/usr/bin/env bash
set -euo pipefail
cat >&2 <<'MESSAGE'
The API is now Go + your existing MySQL Docker service.
The old SSH/pip/systemd deploy path is retired so it cannot resurrect the unauthenticated legacy API.
Review deploy/README.md and apply the explicit Docker Compose migration/deployment steps on your host.
No remote changes were made.
MESSAGE
exit 1
