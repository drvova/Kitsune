describe('Video Player', () => {
  it('should load video player on watch page', () => {
    // Navigate via home page to ensure valid anime/episode
    cy.visit('/', { timeout: 30000 });

    // Wait for anime cards from API
    cy.get('[data-testid="anime-card"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);

    cy.get('[data-testid="anime-card"]')
      .first()
      .click();

    // Wait for anime detail to load
    cy.get('[data-testid="anime-title"]', { timeout: 30000 })
      .should('be.visible');

    cy.contains('Episodes', { timeout: 10000 }).click();

    // Wait for episodes to load from API
    cy.get('[data-testid="episode-item"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);

    cy.get('[data-testid="episode-item"]')
      .first()
      .click();

    // Verify video player loads (may take time for video source API)
    cy.get('[data-testid="video-player"]', { timeout: 30000 })
      .should('be.visible');
  });

  it('should display episode playlist', () => {
    cy.visit('/', { timeout: 30000 });

    cy.get('[data-testid="anime-card"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);

    cy.get('[data-testid="anime-card"]')
      .first()
      .click();

    cy.get('[data-testid="anime-title"]', { timeout: 30000 })
      .should('be.visible');

    cy.contains('Episodes', { timeout: 10000 }).click();

    cy.get('[data-testid="episode-item"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);

    cy.get('[data-testid="episode-item"]')
      .first()
      .click();

    // Check playlist exists on watch page
    cy.get('[data-testid="episode-playlist"]', { timeout: 30000 })
      .should('be.visible');

    cy.get('[data-testid="episode-item"]')
      .should('have.length.greaterThan', 0);
  });

  it('should switch episodes when clicking playlist item', () => {
    cy.visit('/', { timeout: 30000 });

    cy.get('[data-testid="anime-card"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);

    cy.get('[data-testid="anime-card"]')
      .first()
      .click();

    cy.get('[data-testid="anime-title"]', { timeout: 30000 })
      .should('be.visible');

    cy.contains('Episodes', { timeout: 10000 }).click();

    cy.get('[data-testid="episode-item"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);

    // Click first episode
    cy.get('[data-testid="episode-item"]')
      .first()
      .click();

    // Wait for player and playlist to load
    cy.get('[data-testid="video-player"]', { timeout: 30000 })
      .should('be.visible');

    cy.get('[data-testid="episode-playlist"]', { timeout: 30000 })
      .should('be.visible');

    // Get current URL to compare
    cy.url().then((url1) => {
      // Click second episode in playlist
      cy.get('[data-testid="episode-item"]', { timeout: 10000 })
        .eq(1)
        .click();

      // Wait a moment for navigation
      cy.wait(2000);

      // Verify URL changed
      cy.url().should('not.equal', url1);
    });
  });
});