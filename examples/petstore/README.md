# Petstore API SDK

A TypeScript SDK for the **Petstore API** — a sample API for pets.

- **API Version:** 1.0.0
- **Base URL:** `https://api.petstore.com/v1`

## Installation

```bash
npm install petstore-api-sdk
```

## Quickstart

```typescript
import { PetstoreClient } from 'petstore-api-sdk';

const client = new PetstoreClient({
  apiKey: 'your-api-key',
});

// List all pets
const pets = await client.pets.listPets();
console.log(pets);
```

## Configuration

All clients accept a `ClientConfig` object:

```typescript
import { PetstoreClient } from 'petstore-api-sdk';

const client = new PetstoreClient({
  apiKey: 'your-api-key',
  // Optional: override the default base URL
  baseUrl: 'https://api.petstore.com/v1',
  // Optional: additional headers for every request
  headers: {
    'X-Custom-Header': 'value',
  },
});
```

Authentication is handled automatically via the `X-API-Key` header.

## Client Usage

You can use the unified `PetstoreClient` (recommended) which exposes `pets` and `store` sub-clients, or instantiate each client individually.

### Unified Client

```typescript
import { PetstoreClient } from 'petstore-api-sdk';

const client = new PetstoreClient({ apiKey: 'your-api-key' });

// Access pets endpoints via client.pets
// Access store endpoints via client.store
```

### PetsClient

Manage pets in the store.

```typescript
import { PetsClient } from 'petstore-api-sdk';

const pets = new PetsClient({ apiKey: 'your-api-key' });
```

#### `listPets(params?)`

List all pets, with an optional limit.

```typescript
// List all pets
const allPets = await client.pets.listPets();

// List pets with a limit
const somePets = await client.pets.listPets({ limit: 10 });
```

#### `createPet(body)`

Create a new pet.

```typescript
const newPet = await client.pets.createPet({
  name: 'Buddy',
  tag: 'dog',
});
console.log(newPet.id); // The created pet's ID
```

#### `getPet(petId)`

Get a specific pet by ID.

```typescript
const pet = await client.pets.getPet('pet-123');
console.log(pet.name);
```

### StoreClient

Access store inventory data.

```typescript
import { StoreClient } from 'petstore-api-sdk';

const store = new StoreClient({ apiKey: 'your-api-key' });
```

#### `getInventory()`

Get the current store inventory.

```typescript
const inventory = await client.store.getInventory();
console.log(inventory);
```

## Error Handling

All API errors are thrown as `ApiError` instances:

```typescript
import { ApiError } from 'petstore-api-sdk';

try {
  const pet = await client.pets.getPet('nonexistent');
} catch (error) {
  if (error instanceof ApiError) {
    console.error(`API Error ${error.status}: ${error.statusText}`);
    console.error('Response body:', error.body);
  }
}
```

## Types

The SDK exports the following types and classes:

| Name                | Kind      | Description                                      |
|---------------------|-----------|--------------------------------------------------|
| `Pet`               | Interface | Represents a pet (`id`, `name`, `tag?`)          |
| `CreatePetRequest`  | Interface | Request body for creating a pet (`name`, `tag?`) |
| `ClientConfig`      | Interface | Client configuration (`apiKey`, `baseUrl?`, `headers?`) |
| `ApiError`          | Class     | Error thrown on failed API requests              |
| `BaseClient`        | Class     | Base HTTP client (for advanced usage)            |
| `PetsClient`        | Class     | Client for pet endpoints                         |
| `StoreClient`       | Class     | Client for store endpoints                       |
| `PetstoreClient`    | Class     | Unified client composing all sub-clients         |

## License

MIT

