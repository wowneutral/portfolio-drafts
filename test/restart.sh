#!/bin/bash
# Restart the shared dev server so it sees a new version folder. Waits for the browser lock, so it never kills someone's screenshot.
cd "$(dirname "$0")/.." || exit 1
flock -o /tmp/port-browser.lock bash -c 'fuser -k -n tcp 5180 >/dev/null 2>&1; sleep 1; (SKEP_NO_HMR=1 nohup npx vite --port 5180 --strictPort --host 127.0.0.1 > /tmp/port-vite.log 2>&1 &); for i in $(seq 1 40); do curl -s -o /dev/null --max-time 3 http://127.0.0.1:5180/ && break; sleep 1; done'
curl -s -o /dev/null --max-time 3 http://127.0.0.1:5180/ && echo "dev server restarted" || { echo "restart failed; see /tmp/port-vite.log"; exit 1; }
