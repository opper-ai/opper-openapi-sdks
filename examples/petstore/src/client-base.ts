import { ClientConfig, ApiError } from './types.js';

/**
 * Base HTTP client that handles authentication, request building,
 * and response parsing for the Petstore API.
 */
export class BaseClient {
  protected readonly baseUrl: string;
  protected readonly apiKey: string;
  protected readonly headers: Record<string, string>;

  constructor(config: ClientConfig) {
    this.baseUrl = (config.baseUrl ?? 'https://api.petstore.com/v1').replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.headers = config.headers ?? {};
  }

  /**
   * Build the full URL with optional query parameters.
   */
  private buildUrl(path: string, queryParams?: Record<string, string | number | boolean | undefined>): string {
    const url = `${this.baseUrl}${path}`;

    if (!queryParams) {
      return url;
    }

    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    }

    const queryString = searchParams.toString();
    return queryString ? `${url}?${queryString}` : url;
  }

  /**
   * Build the headers for a request, including authentication and content type.
   */
  private buildHeaders(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'X-API-Key': this.apiKey,
      ...this.headers,
    };

    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  /**
   * Parse the response body and throw an ApiError if the response is not OK.
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    let body: unknown;

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      throw new ApiError(response.status, response.statusText, body);
    }

    return body as T;
  }

  /**
   * Perform a GET request.
   */
  protected async get<T>(path: string, queryParams?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = this.buildUrl(path, queryParams);
    const headers = this.buildHeaders(false);

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Perform a POST request.
   */
  protected async post<T>(path: string, body?: unknown, queryParams?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = this.buildUrl(path, queryParams);
    const headers = this.buildHeaders(body !== undefined);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Perform a PUT request.
   */
  protected async put<T>(path: string, body?: unknown, queryParams?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = this.buildUrl(path, queryParams);
    const headers = this.buildHeaders(body !== undefined);

    const response = await fetch(url, {
      method: 'PUT',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Perform a PATCH request.
   */
  protected async patch<T>(path: string, body?: unknown, queryParams?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = this.buildUrl(path, queryParams);
    const headers = this.buildHeaders(body !== undefined);

    const response = await fetch(url, {
      method: 'PATCH',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    return this.handleResponse<T>(response);
  }

  /**
   * Perform a DELETE request.
   */
  protected async delete<T>(path: string, queryParams?: Record<string, string | number | boolean | undefined>): Promise<T> {
    const url = this.buildUrl(path, queryParams);
    const headers = this.buildHeaders(false);

    const response = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    return this.handleResponse<T>(response);
  }
}

