#!/bin/bash

# PWA Phase 1 Verification Script
# Checks that all Phase 1 files are in place and properly configured

echo "=========================================="
echo "PWA Phase 1 Verification"
echo "=========================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter for issues
ISSUES=0

# Function to check file existence
check_file() {
    local filepath=$1
    local description=$2

    if [ -f "$filepath" ]; then
        echo -e "${GREEN}✓${NC} $description"
    else
        echo -e "${RED}✗${NC} $description (NOT FOUND)"
        ISSUES=$((ISSUES + 1))
    fi
}

# Function to check file contains text
check_content() {
    local filepath=$1
    local search_text=$2
    local description=$3

    if grep -q "$search_text" "$filepath"; then
        echo -e "${GREEN}✓${NC} $description"
    else
        echo -e "${RED}✗${NC} $description (NOT FOUND)"
        ISSUES=$((ISSUES + 1))
    fi
}

echo "Checking Modified Files..."
echo "--------"

check_file "package.json" "package.json exists"
check_content "package.json" "workbox-webpack-plugin" "PWA dependencies in package.json"

check_file "next.config.js" "next.config.js exists"
check_content "next.config.js" "Cache-Control" "PWA cache headers configured"

check_file "pages/_document.js" "pages/_document.js exists"
check_content "pages/_document.js" "manifest.json" "Manifest link in _document.js"
check_content "pages/_document.js" "register-sw.js" "SW registration script in _document.js"

check_file "pages/_app.js" "pages/_app.js exists"
check_content "pages/_app.js" "isOnline" "Offline state in _app.js"
check_content "pages/_app.js" "offlineContext" "Offline context in _app.js"

check_file "tailwind.config.js" "tailwind.config.js exists"
check_content "tailwind.config.js" "animation:" "Tailwind animations configured"

echo ""
echo "Checking New Service Files..."
echo "--------"

check_file "services/storage/indexedDB.js" "IndexedDB manager exists"
check_content "services/storage/indexedDB.js" "class IndexedDBManager" "IndexedDB class defined"
check_content "services/storage/indexedDB.js" "savePendingMessage" "Save message method"

check_file "services/offline/offlineDetector.js" "Offline detector exists"
check_content "services/offline/offlineDetector.js" "class OfflineDetector" "OfflineDetector class defined"
check_content "services/offline/offlineDetector.js" "handleOnline" "Online handler method"

echo ""
echo "Checking PWA Files..."
echo "--------"

check_file "public/manifest.json" "manifest.json exists"
check_content "public/manifest.json" "Vitta" "App name in manifest"
check_content "public/manifest.json" "standalone" "Standalone display mode"

check_file "public/register-sw.js" "register-sw.js exists"
check_content "public/register-sw.js" "navigator.serviceWorker.register" "SW registration code"

echo ""
echo "Checking Tests..."
echo "--------"

check_file "__tests__/unit/offline/indexedDB.test.js" "IndexedDB unit tests"
check_file "__tests__/unit/offline/offlineDetector.test.js" "Offline detector unit tests"
check_file "__tests__/integration/offline/offlineFlow.test.js" "Integration tests"

echo ""
echo "Checking Documentation..."
echo "--------"

check_file "docs/PWA_ARCHITECTURE.md" "PWA architecture docs"
check_file "docs/PWA_IMPLEMENTATION_SPECS.md" "Implementation specs"
check_file "PWA_PHASE1_IMPLEMENTATION_COMPLETE.md" "Phase 1 completion report"

echo ""
echo "=========================================="
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}All Phase 1 checks passed! ✓${NC}"
    echo "Ready to run tests: npm run test -- offline"
else
    echo -e "${RED}$ISSUES issue(s) found${NC}"
    echo "Please review the missing files above"
fi
echo "=========================================="

exit $ISSUES
