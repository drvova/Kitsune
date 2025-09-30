# Docker Configuration Options

This project provides multiple Docker configuration options for different deployment scenarios.

## Docker Files

### 1. `Dockerfile` (Default)
**Use for:** Standard Sevalla deployment
**Features:**
- Enhanced module resolution for Docker environments
- Sevalla-specific optimizations
- Go proxy compilation included
- Uses production startup script (`npm run start:production`)
- Comprehensive error handling and debugging

**Usage:**
```bash
docker build -t kitsune .
docker run -p 3000:3000 -p 8080:8080 kitsune
```

### 2. `Dockerfile.buildpack` (Alternative)
**Use for:** Buildpack-based deployment
**Features:**
- Uses Cloud Native Buildpacks for automatic build optimization
- Better caching and build performance
- Simpler configuration
- Hybrid approach (buildpacks + Docker)
- Uses production startup script (`npm run start:production`)

**Usage:**
```bash
docker build -f Dockerfile.buildpack -t kitsune-buildpack .
docker run -p 3000:3000 -p 8080:8080 kitsune-buildpack
```

## Configuration Files

### `project.toml`
Buildpack configuration for Cloud Native Buildpacks.

### `Procfile`
Process definition for platforms that support buildpacks natively.

## Startup Scripts

All Docker configurations use `npm run start:production` by default, which:
- Starts both Next.js (port 3000) and Go proxy (port 8080) concurrently
- Includes health checks for both services
- Provides graceful shutdown handling
- Automatically builds the proxy if binary is missing

## Port Configuration

- **3000**: Next.js application
- **8080**: Go proxy server

Both ports are exposed and available for external access.

## Environment Variables

Key environment variables automatically set:
- `NODE_ENV=production`
- `NEXT_TELEMETRY_DISABLED=1`
- `PORT=3000`
- `HOSTNAME=0.0.0.0`

## Recommendation

For Sevalla deployment, use the default `Dockerfile` which is optimized for that environment and includes all the module resolution fixes we've implemented.

## Buildpack Testing

To test the buildpack approach:
```bash
# Install pack CLI
curl -sSL "https://github.com/buildpacks/pack/releases/download/v0.33.2/pack-v0.33.2-linux.tgz" | tar -C /usr/local/bin/ -xzv pack

# Test buildpack build
./scripts/test-buildpacks.sh
```

## Troubleshooting

If you encounter module resolution issues with Docker:
1. Use the default `Dockerfile` (includes comprehensive fixes)
2. Check the build logs for specific error messages
3. Test the buildpack approach as an alternative
4. Run `./scripts/sevalla-build-helper.sh` for debugging