#!/bin/bash

# Debug script for Next.js module resolution issues in Docker
# This script helps identify and troubleshoot import path problems

echo "=== Next.js Module Resolution Debug Script ==="
echo

# Check if running in Docker
if [ -f /.dockerenv ]; then
    echo "✓ Running inside Docker container"
else
    echo "ℹ Not running in Docker container"
fi

echo
echo "=== Environment Information ==="
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"
echo "Working directory: $(pwd)"
echo

echo "=== File Structure Check ==="
echo "Checking key files and directories..."

# Check source directory structure
if [ -d "src" ]; then
    echo "✓ src directory exists"
    echo "  Contents:"
    ls -la src/ | head -10
else
    echo "✗ src directory missing"
fi

echo
echo "=== Component Files Check ==="
components=(
    "src/components/anime-card.tsx"
    "src/components/ui/tabs.tsx"
    "src/components/watch-button.tsx"
    "src/components/anime-carousel.tsx"
)

for component in "${components[@]}"; do
    if [ -f "$component" ]; then
        echo "✓ $component exists"
    else
        echo "✗ $component missing"
    fi
done

echo
echo "=== Configuration Files Check ==="
config_files=(
    "tsconfig.json"
    "next.config.mjs"
    "package.json"
)

for config in "${config_files[@]}"; do
    if [ -f "$config" ]; then
        echo "✓ $config exists"
    else
        echo "✗ $config missing"
    fi
done

echo
echo "=== TypeScript Path Resolution Test ==="
if command -v npx &> /dev/null; then
    echo "Testing TypeScript path resolution..."
    npx tsc --noEmit --listFiles 2>&1 | grep -E "(error|Error)" | head -5 || echo "✓ No TypeScript path resolution errors detected"
else
    echo "⚠ npx not available, skipping TypeScript check"
fi

echo
echo "=== Node.js Module Resolution Test ==="
echo "Testing module resolution..."

# Create a simple test file to check module resolution
cat > test-module-resolution.js << 'EOF'
try {
  // Test various import patterns
  const paths = [
    '@/components/anime-card',
    '@/components/ui/tabs',
    '@/components/watch-button',
    '@/components/anime-carousel'
  ];

  console.log('Testing module resolution paths:');
  paths.forEach(path => {
    try {
      const resolved = require.resolve(path);
      console.log(`✓ ${path} -> ${resolved}`);
    } catch (e) {
      console.log(`✗ ${path} -> ${e.message}`);
    }
  });
} catch (error) {
  console.error('Error during module resolution test:', error.message);
}
EOF

node test-module-resolution.js
rm -f test-module-resolution.js

echo
echo "=== Build Environment Variables ==="
echo "NODE_ENV: ${NODE_ENV:-not set}"
echo "NEXT_TELEMETRY_DISABLED: ${NEXT_TELEMETRY_DISABLED:-not set}"

echo
echo "=== Memory and Disk Space ==="
echo "Available memory:"
free -h 2>/dev/null || echo "Memory info not available"

echo
echo "Disk usage:"
df -h . | tail -1

echo
echo "=== Debug Complete ==="