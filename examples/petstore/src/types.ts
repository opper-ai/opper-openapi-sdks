/**
 * Represents a pet in the store.
 */
export interface Pet {
  readonly id: string;
  readonly name: string;
  readonly tag?: string;
}

/**
 * Request body for creating a new pet.
 */
export interface CreatePetRequest {
  name: string;
  tag?: string;
}

/**
 * Configuration for the API client.
 */
export interface ClientConfig {
  /** Base URL of the API. Defaults to https://api.petstore.com/v1 */
  baseUrl?: string;
  /** API key used for authentication via X-API-Key header. */
  apiKey: string;
  /** Additional headers to include in every request. */
  headers?: Record<string, string>;
}

/**
 * Error thrown when an API request fails.
 */
export class ApiError extends Error {
  /** HTTP status code of the response. */
  public readonly status: number;
  /** HTTP status text of the response. */
  public readonly statusText: string;
  /** Parsed response body, if available. */
  public readonly body: unknown;

  constructor(status: number, statusText: string, body: unknown) {
    super(`API error ${status}: ${statusText}`);
    this.name = 'ApiError';
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

