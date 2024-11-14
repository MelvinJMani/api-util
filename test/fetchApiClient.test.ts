import FetchApiClient, { setMockResponse } from '../src/FetchApiClient';

describe('FetchApiClient', () => {
    // Initialize the client with a base URL for JSON Placeholder API
    const apiClient = FetchApiClient.getInstance(null, { baseUrl: 'https://jsonplaceholder.typicode.com' });

    beforeEach(() => {
        // Clear all mock implementations and restore defaults
        jest.clearAllMocks();
        jest.restoreAllMocks();
        global.fetch = jest.fn();
    });

    test('should perform a GET request and return data', async () => {
        const mockData = { userId: 1, id: 1, title: 'mock title' };
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            headers: {
                get: (header: string) => (header === "content-type" ? "application/json" : null),
            },
            json: async () => mockData,
        });

        const result = await apiClient.get('/posts/1');
        expect(result).toEqual(mockData);
        expect(global.fetch).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/posts/1', expect.any(Object));
    });

    test('should apply caching for GET requests', async () => {
        const mockData = { userId: 1, id: 1, title: 'mock title' };
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            headers: {
                get: (header: string) => (header === "content-type" ? "application/json" : null),
            },
            json: async () => mockData,
        });

        const url = '/posts/1';
        const cacheOptions = { cacheDuration: 1000 };

        // First call should fetch data
        const result1 = await apiClient.get(url, cacheOptions);
        expect(result1).toEqual(mockData);
        expect(global.fetch).toHaveBeenCalledTimes(1);

        // Second call should return cached data
        const result2 = await apiClient.get(url, cacheOptions);
        expect(result2).toEqual(mockData);
        expect(global.fetch).toHaveBeenCalledTimes(1); // Still one call to fetch
    });

    test('should respect rate limiting by queuing excess requests', async () => {
        jest.useFakeTimers();

        const mockData = { userId: 1, id: 1, title: 'mock title' };
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            headers: {
                get: (header: string) => (header === "content-type" ? "application/json" : null),
            },
            json: async () => mockData,
        });

        const url = '/posts/1';
        const requests = [apiClient.get(url), apiClient.get(url), apiClient.get(url)];
        const results = await Promise.all(requests);

        results.forEach(result => expect(result).toEqual(mockData));
        expect(global.fetch).toHaveBeenCalledTimes(3);

        jest.runAllTimers();
        jest.useRealTimers();
    });

    test('should open circuit breaker after multiple failed attempts', async () => {
        (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

        await expect(apiClient.get('/posts/1')).rejects.toThrow('Network error');
        await expect(apiClient.get('/posts/1')).rejects.toThrow('Network error');
        await expect(apiClient.get('/posts/1')).rejects.toThrow('Network error'); // This should trigger the circuit breaker

        // Next call should be blocked by the circuit breaker
        await expect(apiClient.get('/posts/1')).rejects.toThrow('Circuit breaker is open. Request temporarily blocked.');
    });

    test('should use mock response for testing', async () => {
        const mockResponse = { userId: 1, id: 1, title: 'mock title' };
        setMockResponse('/posts/1', mockResponse);

        const result = await apiClient.get('/posts/1');
        expect(result).toEqual(mockResponse);
    });

    test('should handle offline requests and retry on reconnection', async () => {
        const mockData = { userId: 1, id: 1, title: 'mock title' };
        (global.fetch as jest.Mock).mockResolvedValue({
            ok: true,
            json: async () => mockData,
        });

        // Simulate offline by returning false for navigator.onLine
        jest.spyOn(navigator, 'onLine', 'get').mockReturnValueOnce(false);
        const request = apiClient.get('/posts/1');

        // Simulate going back online
        jest.spyOn(navigator, 'onLine', 'get').mockReturnValueOnce(true);
        window.dispatchEvent(new Event('online'));

        const result = await request;
        expect(result).toEqual(mockData);
    });
});
