describe('Anime Detail Page', () => {
  it('should navigate to anime detail from home and display details', () => {
    cy.visit('/', { timeout: 30000 });

    // Wait for API data to load anime cards
    cy.get('[data-testid="anime-card"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);

    // Click on first anime card from home page
    cy.get('[data-testid="anime-card"]')
      .first()
      .click();

    // Verify we're on anime detail page
    cy.url().should('include', '/anime/');

    // Wait for anime detail API to load
    cy.get('[data-testid="anime-title"]', { timeout: 30000 })
      .should('be.visible');

    cy.get('[data-testid="anime-description"]', { timeout: 15000 })
      .should('be.visible');

    cy.get('[data-testid="anime-poster"]')
      .should('be.visible');
  });

  it('should display episode list in episodes tab', () => {
    cy.visit('/', { timeout: 30000 });

    // Wait for anime cards to load
    cy.get('[data-testid="anime-card"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);

    // Navigate to first anime
    cy.get('[data-testid="anime-card"]')
      .first()
      .click();

    // Wait for detail page to load
    cy.get('[data-testid="anime-title"]', { timeout: 30000 })
      .should('be.visible');

    // Click on Episodes tab
    cy.contains('Episodes', { timeout: 10000 }).click();

    // Check episode list exists (episodes API may take time)
    cy.get('[data-testid="episode-list"]', { timeout: 30000 })
      .should('exist');
  });

  it('should navigate to watch page when clicking episode', () => {
    cy.visit('/', { timeout: 30000 });

    // Wait for anime cards
    cy.get('[data-testid="anime-card"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);

    // Navigate to first anime
    cy.get('[data-testid="anime-card"]')
      .first()
      .click();

    // Wait for detail page
    cy.get('[data-testid="anime-title"]', { timeout: 30000 })
      .should('be.visible');

    // Click on Episodes tab
    cy.contains('Episodes', { timeout: 10000 }).click();

    // Wait for episodes to load, then click first episode
    cy.get('[data-testid="episode-item"]', { timeout: 30000 })
      .first()
      .click();

    // Verify navigation to watch page
    cy.url({ timeout: 15000 }).should('include', '/anime/watch');
  });
});