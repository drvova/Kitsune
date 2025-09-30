# Cypress E2E Tests

## Important: Live API Integration Tests

**These tests require live API data and network connectivity.**

- Tests interact with real anime APIs (not mocked)
- Requires stable internet connection
- API response times can vary (30s timeouts configured)
- Some tests may be flaky due to API availability
- Best used as integration tests rather than unit tests

## Structure

```
cypress/
├── e2e/                    # Test files
│   ├── home.cy.ts         # Home page tests
│   ├── search.cy.ts       # Search functionality tests
│   ├── anime-detail.cy.ts # Anime detail page tests
│   ├── video-player.cy.ts # Video player tests
│   └── profile.cy.ts      # User profile tests
├── fixtures/              # Test data
├── support/               # Custom commands and setup
│   ├── commands.ts        # Custom Cypress commands
│   └── e2e.ts            # Global setup
└── README.md             # This file
```

## Running Tests

### Interactive Mode (UI)
```bash
npm run test:e2e:open
# or
npm run cypress
```

### Headless Mode (CI)
```bash
npm run test:e2e
# or
npm run cypress:headless
```

## Before Running Tests

1. Start the development server:
```bash
npm run dev
# or for both app and proxy
npm run dev:all
```

2. Ensure the app is running at `http://localhost:3000`
3. **Verify internet connection** - tests depend on external anime APIs

## Test Coverage

- **Home Page**: Navigation, content loading from API
- **Search**: Query submission, API results display
- **Anime Detail**: Episode list from API, metadata display
- **Video Player**: Playback, controls, playlist, video source loading
- **Profile**: User data, anime lists, heatmap

## Timeouts & Configuration

Tests are configured with extended timeouts for API calls:
- `defaultCommandTimeout`: 15s
- `pageLoadTimeout`: 30s
- `requestTimeout`: 20s
- `responseTimeout`: 20s

## Known Limitations

- **API Dependency**: Tests fail if anime APIs are down
- **Network Speed**: Slow connections may cause timeouts
- **Flakiness**: API response times vary, tests may intermittently fail
- **No Mocking**: Real data means tests take longer to run

## Customization

Update `data-testid` attributes in components to match test selectors:
- `data-testid="anime-card"`
- `data-testid="search-input"`
- `data-testid="video-player"`
- etc.

## Configuration

Edit `cypress.config.ts` to modify:
- Base URL
- Viewport size
- Video recording
- Screenshot settings
- Timeout values