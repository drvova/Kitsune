describe('Search Functionality', () => {
  beforeEach(() => {
    cy.visit('/search', { timeout: 30000 });
  });

  it('should load search page', () => {
    cy.url().should('include', '/search');
  });

  it('should display search input', () => {
    cy.get('[data-testid="search-input"]', { timeout: 10000 })
      .should('be.visible');
  });

  it('should perform search and display results', () => {
    const searchQuery = 'naruto';

    cy.get('[data-testid="search-input"]', { timeout: 10000 })
      .clear()
      .type(searchQuery);

    // Press Enter to search
    cy.get('[data-testid="search-input"]').type('{enter}');

    // Wait for search API response and results to render
    cy.get('[data-testid="search-results"]', { timeout: 30000 })
      .should('exist');

    cy.get('[data-testid="anime-card"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);
  });

  it('should navigate to anime detail when clicking result', () => {
    const searchQuery = 'one piece';

    cy.get('[data-testid="search-input"]', { timeout: 10000 })
      .clear()
      .type(searchQuery);

    cy.get('[data-testid="search-input"]').type('{enter}');

    // Wait for search results from API
    cy.get('[data-testid="anime-card"]', { timeout: 30000 })
      .should('have.length.greaterThan', 0);

    cy.get('[data-testid="anime-card"]')
      .first()
      .click();

    cy.url({ timeout: 15000 }).should('include', '/anime/');
  });
});