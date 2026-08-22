const { defineConfig } = require('cypress')
const crypto = require('crypto')
const {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
} = require('@aws-sdk/client-cognito-identity-provider')

// Load environment variables from .env file if it exists
try {
  require('dotenv').config()
} catch {
  // dotenv not available or .env file doesn't exist
}

// Cognito's OAuth2 /oauth2/token endpoint has no password grant (unlike
// Auth0/oidc-simulator, which auth-helpers.js's REST-based flow targets), so
// test-user login against a Cognito-backed environment goes through the
// InitiateAuth API instead. dev/prod's app client is public (no secret, see
// docs/adr/0008) -- SECRET_HASH is only computed, and only runs here in the
// Node/plugin process rather than the browser, for the rare confidential
// client case.
async function cognitoPasswordAuth({ issuer, clientId, clientSecret, username, password }) {
  const region = new URL(issuer).host.split('.')[1] // cognito-idp.<region>.amazonaws.com

  const authParameters = { USERNAME: username, PASSWORD: password }
  if (clientSecret) {
    authParameters.SECRET_HASH = crypto
      .createHmac('sha256', clientSecret)
      .update(username + clientId)
      .digest('base64')
  }

  const client = new CognitoIdentityProviderClient({ region })
  const result = await client.send(
    new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: clientId,
      AuthParameters: authParameters,
    }),
  )

  // The server's OIDC audience check expects an `aud` claim equal to the
  // client_id (see server/src/auth/hybrid-jwt.ts), which is Cognito's
  // IdToken shape, not its AccessToken (which carries `client_id` instead).
  return result.AuthenticationResult.IdToken
}

// One way to run Cypress against a different url is to pass CYPRESS_BASE_URL env variable,
// e.g. CYPRESS_BASE_URL=http://localhost:5000 npm test
// See https://docs.cypress.io/guides/guides/environment-variables

module.exports = defineConfig({
  // required to test within iframe:
  chromeWebSecurity: false,
  requestTimeout: process.env.CI ? 10000 : 5000,
  defaultCommandTimeout: process.env.CI ? 10000 : 4000,
  responseTimeout: process.env.CI ? 30000 : 5000,
  pageLoadTimeout: process.env.CI ? 60000 : 30000,
  // Retry failed tests in CI for better stability
  retries: process.env.CI ? { runMode: 2, openMode: 0 } : 0,
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || process.env.BASE_URL || 'http://localhost',
    experimentalRunAllSpecs: true,
    video: false,
    setupNodeEvents(on, config) {
      // implement node event listeners here
      require('cypress-terminal-report/src/installLogsPrinter')(on)

      // Add task to log messages from tests
      on('task', {
        log(message) {
          console.log(message)
          return null
        },
        cognitoPasswordAuth,
      })

      return config
    },
    env: {
      // OIDC configuration from environment variables
      AUTH_AUDIENCE: process.env.AUTH_AUDIENCE || 'users',
      AUTH_CLIENT_ID: process.env.AUTH_CLIENT_ID || 'dev-client-id',
      AUTH_CLIENT_SECRET: process.env.AUTH_CLIENT_SECRET || '',
      AUTH_ISSUER: process.env.AUTH_ISSUER || 'https://localhost:3000/',
      // Only set for Cognito-backed environments; empty means "hosted-UI
      // origin == issuer origin" (true for Auth0/oidc-simulator).
      AUTH_DOMAIN: process.env.AUTH_DOMAIN || '',
      AUTH_NAMESPACE: process.env.AUTH_NAMESPACE || 'https://pol.is/',
      OIDC_CACHE_KEY_PREFIX: process.env.OIDC_CACHE_KEY_PREFIX || 'oidc.user',
      // CI environment detection for test configuration
      CI: process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true',
    },
  },
})
