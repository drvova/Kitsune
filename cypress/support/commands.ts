/// <reference types="cypress" />

declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to login
     * @example cy.login('username', 'password')
     */
    login(username: string, password: string): Chainable<void>;
  }
}

Cypress.Commands.add('login', (username: string, password: string) => {
  // Implementation will depend on your auth system
  cy.visit('/');
  cy.get('[data-testid="login-button"]').click();
  cy.get('[data-testid="username-input"]').type(username);
  cy.get('[data-testid="password-input"]').type(password);
  cy.get('[data-testid="submit-login"]').click();
});