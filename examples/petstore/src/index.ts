export type { Pet, CreatePetRequest, ClientConfig } from './types.js';
export { ApiError } from './types.js';
export { BaseClient } from './client-base.js';
export { PetsClient } from './clients/pets.js';
export { StoreClient } from './clients/store.js';

import type { ClientConfig } from './types.js';
import { PetsClient } from './clients/pets.js';
import { StoreClient } from './clients/store.js';

/**
 * Unified Petstore API client that provides access to all API endpoints
 * through composed sub-clients.
 */
export class PetstoreClient {
  /** Client for pet-related endpoints. */
  public readonly pets: PetsClient;
  /** Client for store-related endpoints. */
  public readonly store: StoreClient;

  /**
   * Create a new PetstoreClient.
   * @param config - Client configuration including API key and optional base URL.
   */
  constructor(config: ClientConfig) {
    this.pets = new PetsClient(config);
    this.store = new StoreClient(config);
  }
}

