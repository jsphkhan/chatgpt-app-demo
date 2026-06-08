#!/bin/bash

# Expose chatgpt-app-demo (Streamable HTTP MCP) through ngrok for ChatGPT testing.
# Pattern aligned with travel-agent/packages/mcp-funnel/scripts/serve-ngrok.sh:
# static reserved domain, temp ngrok config, merged user config.
#
# This script:
# 1. Builds the React widget (npm run build)
# 2. Starts the MCP server on a local port with BASE_URL set to the public ngrok host
# 3. Starts one ngrok HTTP tunnel to that port
#
# Prerequisites:
# - ngrok installed and authenticated (`ngrok config add-authtoken …` once globally)
# - A reserved ngrok domain matching NGROK_DOMAIN (paid plan), or override:
#     NGROK_DOMAIN=my-demo.ngrok.dev ./scripts/serve-ngrok.sh
#
# Usage (from project root):
#   ./scripts/serve-ngrok.sh
# Or:
#   npm run start:ngrok

set -e

SERVER_PID=""

# Static ngrok hostname (paid / reserved). Override for your account.
NGROK_DOMAIN="${NGROK_DOMAIN:-chatgpt-hello-demo.ngrok.dev}"

# Local port for the Express MCP server (must match server.js default)
SERVER_PORT="${PORT:-3000}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

PUBLIC_URL="https://${NGROK_DOMAIN}"
MCP_URL="${PUBLIC_URL}/mcp"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

cleanup() {
    local code="${1:-0}"
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    pkill -f "ngrok" 2>/dev/null || true
    if [ -n "${SERVER_PID:-}" ]; then
        kill "$SERVER_PID" 2>/dev/null || true
    fi
    rm -f "${NGROK_CONFIG:-}" 2>/dev/null || true
    exit "$code"
}

trap 'cleanup 0' SIGINT SIGTERM

echo -e "${CYAN}========================================${NC}"
echo -e "${CYAN}  chatgpt-app-demo — ngrok tunnel${NC}"
echo -e "${CYAN}========================================${NC}"
echo ""
echo -e "${CYAN}Reserved host:${NC}  ${PUBLIC_URL}"
echo -e "${CYAN}Local port:${NC}     ${SERVER_PORT}"
echo ""

cd "$PROJECT_DIR"

echo -e "${YELLOW}Building widget...${NC}"
npm run build
echo ""

echo -e "${YELLOW}Stopping any existing ngrok processes...${NC}"
pkill -f "ngrok" 2>/dev/null || true
sleep 1

echo -e "${YELLOW}Starting MCP server on port ${SERVER_PORT}...${NC}"
export PORT="$SERVER_PORT"
export BASE_URL="$PUBLIC_URL"
node server.js &
SERVER_PID=$!
sleep 2

echo -e "${YELLOW}Starting ngrok tunnel...${NC}"

NGROK_CONFIG="$(mktemp)"
cat > "$NGROK_CONFIG" << EOF
version: "3"
tunnels:
  hello-app:
    addr: ${SERVER_PORT}
    proto: http
    domain: ${NGROK_DOMAIN}
EOF

USER_CONFIG="${NGROK_USER_CONFIG:-}"
if [ -z "$USER_CONFIG" ]; then
    MAC_NGROK="${HOME}/Library/Application Support/ngrok/ngrok.yml"
    LINUX_NGROK="${HOME}/.config/ngrok/ngrok.yml"
    if [ -f "$MAC_NGROK" ]; then
        USER_CONFIG="$MAC_NGROK"
    elif [ -f "$LINUX_NGROK" ]; then
        USER_CONFIG="$LINUX_NGROK"
    fi
fi
if [ -z "$USER_CONFIG" ] || [ ! -f "$USER_CONFIG" ]; then
    echo -e "${RED}ngrok user config not found.${NC}"
    echo -e "${YELLOW}Run: ngrok config add-authtoken <token>${NC}"
    echo -e "${YELLOW}Or set NGROK_USER_CONFIG to your ngrok.yml path.${NC}"
    cleanup 1
fi

ngrok start hello-app --config "$USER_CONFIG" --config "$NGROK_CONFIG" --log=stdout > /dev/null &
sleep 3

echo -e "${YELLOW}Verifying ngrok tunnel...${NC}"
TUNNELS_JSON="$(curl -s http://127.0.0.1:4040/api/tunnels 2>/dev/null || echo "{}")"

if echo "$TUNNELS_JSON" | grep -q "$NGROK_DOMAIN"; then
    echo -e "${GREEN}Tunnel host seen in ngrok API${NC}"
else
    echo -e "${RED}Warning: tunnel may not be active (check ngrok dashboard / reserved domain).${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Hello World ChatGPT App — ready${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${CYAN}Health:${NC}           ${PUBLIC_URL}/"
echo -e "${CYAN}MCP (Streamable):${NC} ${MCP_URL}"
echo ""
echo -e "${YELLOW}ChatGPT setup:${NC}"
echo -e "  1. Settings → Apps & Connectors → Advanced → Developer mode ON"
echo -e "  2. Settings → Connectors → Create"
echo -e "  3. Paste: ${MCP_URL}"
echo -e '  4. In a chat, add the connector (+ → More), then say "Show my horoscope"'
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop ngrok and the local server${NC}"
echo ""

wait "$SERVER_PID" || cleanup 1
