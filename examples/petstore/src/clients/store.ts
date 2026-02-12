import { BaseClient } from '../client-base.js';

/**
 * Client for the Store API endpoints.
 * Provides methods to interact with store inventory.
 */
export class StoreClient extends BaseClient {
  /**
   * Get inventory counts.
   *
   * Retrieves the current store inventory as a map of status to count.
   *
   * @returns A promise that resolves to the inventory map.
   */
  async getInventory(): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>('/store/inventory');
  }
}

