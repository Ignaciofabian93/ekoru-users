import request from 'supertest';

// Targets the live staging instance by default.
// Override with TEST_BASE_URL env var when needed (e.g. for production smoke tests).
const BASE_URL = process.env.TEST_BASE_URL ?? 'http://localhost:4001';

// ─── Helper ───────────────────────────────────────────────────────────────────

function gql(
  query: string,
  variables?: Record<string, unknown>,
  headers?: Record<string, string>,
) {
  const req = request(BASE_URL)
    .post('/graphql')
    .set('Content-Type', 'application/json');

  if (headers) {
    Object.entries(headers).forEach(([k, v]) => req.set(k, v));
  }

  return req.send({ query, variables });
}

// Wait for the service to become ready (useful right after a fresh deploy).
async function waitForReady(retries = 10, delayMs = 3000): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await request(BASE_URL).get('/health');
      if (res.status === 200) return;
    } catch {
      // not ready yet
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(
    `Service at ${BASE_URL} did not become ready after ${retries} retries`,
  );
}

// ─── Suite ────────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await waitForReady();
});

// ── 1. Infrastructure ─────────────────────────────────────────────────────────

describe('Health', () => {
  it('GET /health returns { status: ok }', async () => {
    const res = await request(BASE_URL).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });
});

// ── 2. GraphQL schema ─────────────────────────────────────────────────────────

describe('GraphQL schema', () => {
  it('responds to a basic __typename query', async () => {
    const res = await gql('{ __typename }');
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(res.body.data.__typename).toBe('Query');
  });

  it('exposes a valid Apollo Federation SDL via _service', async () => {
    const res = await gql('{ _service { sdl } }');
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const sdl: string = res.body.data._service.sdl;
    expect(typeof sdl).toBe('string');
    expect(sdl.length).toBeGreaterThan(0);
    // A federation subgraph must expose @key directives
    expect(sdl).toContain('@key');
  });
});

// ── 3. Location (read-only, no auth required) ─────────────────────────────────

describe('Location', () => {
  it('returns a non-empty list of countries', async () => {
    const res = await gql(`
      query {
        countries(language: ES) {
          id
          name
        }
      }
    `);
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const countries: { id: number; name: string }[] = res.body.data.countries;
    expect(Array.isArray(countries)).toBe(true);
    expect(countries.length).toBeGreaterThan(0);
    expect(countries[0]).toHaveProperty('id');
    expect(countries[0]).toHaveProperty('name');
  });

  it('returns regions for the first country', async () => {
    const countriesRes = await gql('{ countries(language: ES) { id } }');
    const firstId: number = countriesRes.body.data.countries[0].id;

    const res = await gql(
      `
      query ($id: Int!) {
        regionsByCountryId(countryId: $id, language: ES) {
          id
          region
        }
      }
    `,
      { id: firstId },
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(Array.isArray(res.body.data.regionsByCountryId)).toBe(true);
  });
});

// ── 4. Sellers (read-only) ────────────────────────────────────────────────────

describe('Sellers', () => {
  it('returns seller levels', async () => {
    const res = await gql(`
      query {
        sellerLevels {
          id
          levelName
          minPoints
        }
      }
    `);
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();
    expect(Array.isArray(res.body.data.sellerLevels)).toBe(true);
  });
});

// ── 5. Registration flow (write) ──────────────────────────────────────────────

describe('Registration flow', () => {
  // Use .invalid TLD — guaranteed non-deliverable, clearly test data
  const testEmail = `e2e-${Date.now()}@ekoru.invalid`;

  const REGISTER_MUTATION = `
    mutation Register($input: RegisterPersonInput!) {
      registerPerson(input: $input) {
        id
        email
        sellerType
        isActive
        isVerified
      }
    }
  `;

  const testInput = {
    email: testEmail,
    password: 'TestPass123!',
    firstName: 'E2E',
    lastName: 'Test',
  };

  let createdSellerId: string;

  it('registerPerson creates a new seller', async () => {
    const res = await gql(REGISTER_MUTATION, { input: testInput });
    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const seller = res.body.data.registerPerson;
    expect(seller.email).toBe(testEmail);
    expect(seller.sellerType).toBe('PERSON');
    expect(seller.isActive).toBe(true);
    expect(seller.id).toBeDefined();

    createdSellerId = seller.id;
  });

  it('registerPerson rejects a duplicate email', async () => {
    const res = await gql(REGISTER_MUTATION, { input: testInput });
    expect(res.status).toBe(200);
    // Must return a GraphQL error, not a 500
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors.length).toBeGreaterThan(0);
  });

  // ── 6. Federation entity resolution ────────────────────────────────────────
  // Validates that the gateway can resolve Seller entities from this subgraph.

  it('resolves a Seller entity via _entities (federation)', async () => {
    if (!createdSellerId) {
      console.warn('Skipping _entities test — no seller was created');
      return;
    }

    const res = await gql(
      `
      query ($representations: [_Any!]!) {
        _entities(representations: $representations) {
          ... on Seller {
            id
            email
          }
        }
      }
    `,
      {
        representations: [{ __typename: 'Seller', id: createdSellerId }],
      },
    );

    expect(res.status).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const entity = res.body.data._entities[0];
    expect(entity.id).toBe(createdSellerId);
    expect(entity.email).toBe(testEmail);
  });
});
