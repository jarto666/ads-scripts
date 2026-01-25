// Use API_URL env var or default to localhost for fetching OpenAPI spec
const API_URL = process.env.API_URL || 'http://localhost:3001';

module.exports = {
  api: {
    input: `${API_URL}/api/docs/openapi.json`,
    output: {
      clean: true,
      prettier: true,
      target: './src/api/generated/api.ts',
      schemas: './src/api/generated/models',
      client: 'react-query',
      override: {
        mutator: {
          path: './src/api/customInstance.ts',
          name: 'customInstance',
        },
      },
    },
  },
};
