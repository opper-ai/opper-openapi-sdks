import { Pet, CreatePetRequest } from '../types.js';
import { BaseClient } from '../client-base.js';

/**
 * Client for the Pets API endpoints.
 */
export class PetsClient extends BaseClient {
  /**
   * List all pets.
   * @param params - Optional query parameters.
   * @param params.limit - Maximum number of pets to return.
   * @returns A list of pets.
   */
  async listPets(params?: { limit?: number }): Promise<Pet[]> {
    return this.get<Pet[]>('/pets', {
      limit: params?.limit,
    });
  }

  /**
   * Create a new pet.
   * @param body - The pet data to create.
   * @returns The created pet.
   */
  async createPet(body: CreatePetRequest): Promise<Pet> {
    return this.post<Pet>('/pets', body);
  }

  /**
   * Get a pet by its ID.
   * @param petId - The ID of the pet to retrieve.
   * @returns The requested pet.
   */
  async getPet(petId: string): Promise<Pet> {
    return this.get<Pet>(`/pets/${encodeURIComponent(petId)}`);
  }
}

