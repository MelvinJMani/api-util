type RequestOptions = {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    timeout?: number;
    retryCount?: number;
    cacheDuration?: number; // Caching duration in milliseconds for GET requests
};

interface ConfigOptions {
    baseUrl?: string;
    headers?: Record<string, string>;
    timeout?: number;
    retryCount?: number;
    rateLimitCount?: number;
    rateLimitInterval?: number;
}

class FetchApiClient {
    private static instances: Record<string, FetchApiClient> = {};
    private static defaultInstance: FetchApiClient | null = null;

    private baseUrl: string;
    private defaultHeaders: Record<string, string>;
    private timeout: number;
    private retryCount: number;
    private requestInterceptors: Array<(options: RequestOptions) => RequestOptions> = [];
    private responseInterceptors: Array<(response: Response) => Promise<any> | any> = [];
    private cache: Map<string, { data: any; expiry: number }> = new Map(); // Cache for GET requests

    // Rate limiting and circuit breaker configurations
    private rateLimitCount: number;
    private rateLimitInterval: number;
    private requestQueue: Array<{ url: string; options?: RequestOptions; resolve: (value: any) => void; reject: (reason?: any) => void }> = [];
    private requestCount: number = 0;
    private lastRequestTime: number = Date.now();
    private failedAttempts: number = 0;
    private circuitBreakerOpen: boolean = false;
    private circuitBreakerTimeout: number = 30000; // 30 seconds for the circuit breaker

    private constructor(config: ConfigOptions) {
        this.baseUrl = config.baseUrl || '';
        this.defaultHeaders = config.headers || {};
        this.timeout = config.timeout || 5000;
        this.retryCount = config.retryCount || 3;

        this.rateLimitCount = config.rateLimitCount || 60;
        this.rateLimitInterval = config.rateLimitInterval || 60000;

        // Start processing the queue
        this.processQueue();

        // Inside the constructor
        if (typeof window !== 'undefined') {
            window.addEventListener("online", () => this.retryOfflineRequests());
        }
    }

    public static getInstance(name: string | null = null, config: ConfigOptions = {}): FetchApiClient {
        if (name) {
            if (!FetchApiClient.instances[name]) {
                FetchApiClient.instances[name] = new FetchApiClient(config);
            }
            return FetchApiClient.instances[name];
        } else {
            if (!FetchApiClient.defaultInstance) {
                FetchApiClient.defaultInstance = new FetchApiClient(config);
            }
            return FetchApiClient.defaultInstance;
        }
    }

    // Add request/response interceptors
    public addRequestInterceptor(interceptor: (options: RequestOptions) => RequestOptions): void {
        this.requestInterceptors.push(interceptor);
    }

    public addResponseInterceptor(interceptor: (data: Response | any) => Promise<any> | any): void {
        this.responseInterceptors.push(interceptor);
    }

    // Apply interceptors
    private applyRequestInterceptors(options: RequestOptions): RequestOptions {
        return this.requestInterceptors.reduce((opts, interceptor) => interceptor(opts), options);
    }

    private async applyResponseInterceptors(response: Response): Promise<any> {
        // Parse JSON only once if the response is OK and has JSON content type
        const contentType = response.headers.get("content-type") || "";
        let data = response;
    
        if (response.ok && contentType.includes("application/json")) {
            data = await response.json();
        }
    
        // Pass parsed data through each interceptor
        for (const interceptor of this.responseInterceptors) {
            data = await interceptor(data);
        }
        
        return data;
    }

    // Main request method with caching, rate limiting, and circuit breaker
    public async request(url: string, options: RequestOptions = {}): Promise<any> {
        if (this.circuitBreakerOpen) {
            throw new Error('Circuit breaker is open. Request temporarily blocked.');
        }

        // Check cache for GET requests
        if (options.method === 'GET' && options.cacheDuration) {
            const cachedResponse = this.getFromCache(url);
            if (cachedResponse) return cachedResponse;
        }

        return new Promise((resolve, reject) => {
            if (this.requestCount < this.rateLimitCount) {
                this.requestCount += 1;
                this.lastRequestTime = Date.now();
                this.executeRequest(url, options, resolve, reject);
            } else {
                this.enqueueRequest(url, options, resolve, reject);
            }
        });
    }

    private async executeRequest(url: string, options: RequestOptions = {}, resolve: (value: any) => void, reject: (reason?: any) => void) {
        const fullUrl = `${this.baseUrl}${url}`;
        const finalOptions = this.applyRequestInterceptors({
            ...options,
            headers: { ...this.defaultHeaders, ...options.headers },
            method: options.method || 'GET',
            body: options.body ? JSON.stringify(options.body) : null,
        });
        const requestOptions: RequestInit = { ...finalOptions };
    
        try {
            const response = await fetch(fullUrl, requestOptions);
            const parsedResponse = await this.applyResponseInterceptors(response);
    
            if (options.method === 'GET' && options.cacheDuration) {
                this.cacheResponse(url, parsedResponse, options.cacheDuration);
            }
            this.logRequest(fullUrl, requestOptions, parsedResponse);
            resolve(parsedResponse);
        } catch (error) {
            this.logError(error);
            this.failedAttempts += 1;
            if (this.failedAttempts >= 3) this.openCircuitBreaker();
            reject(error);
        }
    }
    

    private cacheResponse(url: string, data: any, duration: number) {
        const expiry = Date.now() + duration;
        this.cache.set(url, { data, expiry });
    }

    private getFromCache(url: string): any | null {
        const cached = this.cache.get(url);
        if (cached && Date.now() < cached.expiry) {
            this.logInfo(`Cache hit for ${url}`);
            return cached.data;
        }
        this.cache.delete(url); // Remove expired cache
        return null;
    }

    private openCircuitBreaker() {
        this.circuitBreakerOpen = true;
        setTimeout(() => {
            this.circuitBreakerOpen = false;
            this.failedAttempts = 0;
        }, this.circuitBreakerTimeout);
        this.logInfo('Circuit breaker opened');
    }

    private enqueueRequest(url: string, options: RequestOptions, resolve: (value: any) => void, reject: (reason?: any) => void) {
        this.requestQueue.push({ url, options, resolve, reject });
    }

    private async processQueue() {
        setInterval(async () => {
            if (this.requestQueue.length === 0) return;

            const now = Date.now();
            const timeElapsed = now - this.lastRequestTime;

            if (this.requestCount < this.rateLimitCount || timeElapsed >= this.rateLimitInterval) {
                if (timeElapsed >= this.rateLimitInterval) {
                    this.requestCount = 0;
                    this.lastRequestTime = now;
                }

                const { url, options, resolve, reject } = this.requestQueue.shift()!;
                this.requestCount += 1;
                try {
                    const response = await this.request(url, options);
                    resolve(response);
                } catch (error) {
                    reject(error);
                }
            }
        }, 100);
    }

    // Retry requests when online
    private retryOfflineRequests() {
        this.requestQueue.forEach(({ url, options, resolve, reject }) => {
            this.executeRequest(url, options, resolve, reject);
        });
        this.requestQueue = [];
    }

    // Logging
    private logRequest(url: string, options: RequestInit, response: any) {
        const headers: Record<string, string> = this.convertHeadersToRecord(options.headers);
        console.log('Request:', { url, options: { ...options, headers }, response });
    }

    // Helper function to convert headers to Record<string, string>
    private convertHeadersToRecord(headers: HeadersInit | undefined): Record<string, string> {
        if (!headers) return {};

        if (headers instanceof Headers) {
            const result: Record<string, string> = {};
            headers.forEach((value, key) => {
                result[key] = value;
            });
            return result;
        } else if (Array.isArray(headers)) {
            return Object.fromEntries(headers);
        } else {
            return headers;
        }
    }
    

    private logError(error: any) {
        console.error('Error:', error);
    }

    private logInfo(message: string) {
        console.info('Info:', message);
    }

    // Public methods for GET, POST, PUT, DELETE
    public get(url: string, options?: RequestOptions): Promise<any> {
        return this.request(url, { ...options, method: 'GET' });
    }

    public post(url: string, options?: RequestOptions): Promise<any> {
        return this.request(url, { ...options, method: 'POST' });
    }

    public put(url: string, options?: RequestOptions): Promise<any> {
        return this.request(url, { ...options, method: 'PUT' });
    }

    public delete(url: string, options?: RequestOptions): Promise<any> {
        return this.request(url, { ...options, method: 'DELETE' });
    }
}

// Mocking for testing
function setMockResponse(url: string, response: any) {
    FetchApiClient.prototype.request = async function () {
        return response;
    };
}

export default FetchApiClient;
export { setMockResponse };
