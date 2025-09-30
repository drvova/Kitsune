describe('Home Page', () => {
  beforeEach(() => {
    cy.visit('/', { timeout: 30000 });
  });

  it('should load the home page successfully', () => {
    cy.url().should('eq', Cypress.config().baseUrl + '/');
  });

  it('should display the navbar', () => {
    cy.get('nav', { timeout: 10000 }).should('be.visible');
  });

  it('should display anime content on home page', () => {
    // Wait for API data to load - anime cards appear after API response
    cy.get('[data-testid="anime-card"]', { timeout: 30000 })
      .should('exist')
      .and('have.length.greaterThan', 0);
  });

  it('should navigate to search when clicking search', () => {
    cy.get('[data-testid="search-button"]', { timeout: 10000 }).click();
    cy.url().should('include', '/search');
  });
});