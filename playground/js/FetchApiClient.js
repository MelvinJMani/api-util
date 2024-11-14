"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setMockResponse = setMockResponse;
var FetchApiClient = /** @class */ (function () {
    function FetchApiClient(config) {
        var _this = this;
        this.requestInterceptors = [];
        this.responseInterceptors = [];
        this.cache = new Map(); // Cache for GET requests
        this.requestQueue = [];
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
        this.failedAttempts = 0;
        this.circuitBreakerOpen = false;
        this.circuitBreakerTimeout = 30000; // 30 seconds for the circuit breaker
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
            window.addEventListener("online", function () { return _this.retryOfflineRequests(); });
        }
    }
    FetchApiClient.getInstance = function (name, config) {
        if (name === void 0) { name = null; }
        if (config === void 0) { config = {}; }
        if (name) {
            if (!FetchApiClient.instances[name]) {
                FetchApiClient.instances[name] = new FetchApiClient(config);
            }
            return FetchApiClient.instances[name];
        }
        else {
            if (!FetchApiClient.defaultInstance) {
                FetchApiClient.defaultInstance = new FetchApiClient(config);
            }
            return FetchApiClient.defaultInstance;
        }
    };
    // Add request/response interceptors
    FetchApiClient.prototype.addRequestInterceptor = function (interceptor) {
        this.requestInterceptors.push(interceptor);
    };
    FetchApiClient.prototype.addResponseInterceptor = function (interceptor) {
        this.responseInterceptors.push(interceptor);
    };
    // Apply interceptors
    FetchApiClient.prototype.applyRequestInterceptors = function (options) {
        return this.requestInterceptors.reduce(function (opts, interceptor) { return interceptor(opts); }, options);
    };
    FetchApiClient.prototype.applyResponseInterceptors = function (response) {
        return __awaiter(this, void 0, void 0, function () {
            var contentType, data, _i, _a, interceptor;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        contentType = response.headers.get("content-type") || "";
                        data = response;
                        if (!(response.ok && contentType.includes("application/json"))) return [3 /*break*/, 2];
                        return [4 /*yield*/, response.json()];
                    case 1:
                        data = _b.sent();
                        _b.label = 2;
                    case 2:
                        _i = 0, _a = this.responseInterceptors;
                        _b.label = 3;
                    case 3:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        interceptor = _a[_i];
                        return [4 /*yield*/, interceptor(data)];
                    case 4:
                        data = _b.sent();
                        _b.label = 5;
                    case 5:
                        _i++;
                        return [3 /*break*/, 3];
                    case 6: return [2 /*return*/, data];
                }
            });
        });
    };
    // Main request method with caching, rate limiting, and circuit breaker
    FetchApiClient.prototype.request = function (url_1) {
        return __awaiter(this, arguments, void 0, function (url, options) {
            var cachedResponse;
            var _this = this;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                if (this.circuitBreakerOpen) {
                    throw new Error('Circuit breaker is open. Request temporarily blocked.');
                }
                // Check cache for GET requests
                if (options.method === 'GET' && options.cacheDuration) {
                    cachedResponse = this.getFromCache(url);
                    if (cachedResponse)
                        return [2 /*return*/, cachedResponse];
                }
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        if (_this.requestCount < _this.rateLimitCount) {
                            _this.requestCount += 1;
                            _this.lastRequestTime = Date.now();
                            _this.executeRequest(url, options, resolve, reject);
                        }
                        else {
                            _this.enqueueRequest(url, options, resolve, reject);
                        }
                    })];
            });
        });
    };
    FetchApiClient.prototype.executeRequest = function (url_1) {
        return __awaiter(this, arguments, void 0, function (url, options, resolve, reject) {
            var fullUrl, finalOptions, requestOptions, response, parsedResponse, error_1;
            if (options === void 0) { options = {}; }
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        fullUrl = "".concat(this.baseUrl).concat(url);
                        finalOptions = this.applyRequestInterceptors(__assign(__assign({}, options), { headers: __assign(__assign({}, this.defaultHeaders), options.headers), method: options.method || 'GET', body: options.body ? JSON.stringify(options.body) : null }));
                        requestOptions = __assign({}, finalOptions);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, fetch(fullUrl, requestOptions)];
                    case 2:
                        response = _a.sent();
                        return [4 /*yield*/, this.applyResponseInterceptors(response)];
                    case 3:
                        parsedResponse = _a.sent();
                        if (options.method === 'GET' && options.cacheDuration) {
                            this.cacheResponse(url, parsedResponse, options.cacheDuration);
                        }
                        this.logRequest(fullUrl, requestOptions, parsedResponse);
                        resolve(parsedResponse);
                        return [3 /*break*/, 5];
                    case 4:
                        error_1 = _a.sent();
                        this.logError(error_1);
                        this.failedAttempts += 1;
                        if (this.failedAttempts >= 3)
                            this.openCircuitBreaker();
                        reject(error_1);
                        return [3 /*break*/, 5];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    FetchApiClient.prototype.cacheResponse = function (url, data, duration) {
        var expiry = Date.now() + duration;
        this.cache.set(url, { data: data, expiry: expiry });
    };
    FetchApiClient.prototype.getFromCache = function (url) {
        var cached = this.cache.get(url);
        if (cached && Date.now() < cached.expiry) {
            this.logInfo("Cache hit for ".concat(url));
            return cached.data;
        }
        this.cache.delete(url); // Remove expired cache
        return null;
    };
    FetchApiClient.prototype.openCircuitBreaker = function () {
        var _this = this;
        this.circuitBreakerOpen = true;
        setTimeout(function () {
            _this.circuitBreakerOpen = false;
            _this.failedAttempts = 0;
        }, this.circuitBreakerTimeout);
        this.logInfo('Circuit breaker opened');
    };
    FetchApiClient.prototype.enqueueRequest = function (url, options, resolve, reject) {
        this.requestQueue.push({ url: url, options: options, resolve: resolve, reject: reject });
    };
    FetchApiClient.prototype.processQueue = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                setInterval(function () { return __awaiter(_this, void 0, void 0, function () {
                    var now, timeElapsed, _a, url, options, resolve, reject, response, error_2;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                if (this.requestQueue.length === 0)
                                    return [2 /*return*/];
                                now = Date.now();
                                timeElapsed = now - this.lastRequestTime;
                                if (!(this.requestCount < this.rateLimitCount || timeElapsed >= this.rateLimitInterval)) return [3 /*break*/, 4];
                                if (timeElapsed >= this.rateLimitInterval) {
                                    this.requestCount = 0;
                                    this.lastRequestTime = now;
                                }
                                _a = this.requestQueue.shift(), url = _a.url, options = _a.options, resolve = _a.resolve, reject = _a.reject;
                                this.requestCount += 1;
                                _b.label = 1;
                            case 1:
                                _b.trys.push([1, 3, , 4]);
                                return [4 /*yield*/, this.request(url, options)];
                            case 2:
                                response = _b.sent();
                                resolve(response);
                                return [3 /*break*/, 4];
                            case 3:
                                error_2 = _b.sent();
                                reject(error_2);
                                return [3 /*break*/, 4];
                            case 4: return [2 /*return*/];
                        }
                    });
                }); }, 100);
                return [2 /*return*/];
            });
        });
    };
    // Retry requests when online
    FetchApiClient.prototype.retryOfflineRequests = function () {
        var _this = this;
        this.requestQueue.forEach(function (_a) {
            var url = _a.url, options = _a.options, resolve = _a.resolve, reject = _a.reject;
            _this.executeRequest(url, options, resolve, reject);
        });
        this.requestQueue = [];
    };
    // Logging
    FetchApiClient.prototype.logRequest = function (url, options, response) {
        var headers = this.convertHeadersToRecord(options.headers);
        console.log('Request:', { url: url, options: __assign(__assign({}, options), { headers: headers }), response: response });
    };
    // Helper function to convert headers to Record<string, string>
    FetchApiClient.prototype.convertHeadersToRecord = function (headers) {
        if (!headers)
            return {};
        if (headers instanceof Headers) {
            var result_1 = {};
            headers.forEach(function (value, key) {
                result_1[key] = value;
            });
            return result_1;
        }
        else if (Array.isArray(headers)) {
            return Object.fromEntries(headers);
        }
        else {
            return headers;
        }
    };
    FetchApiClient.prototype.logError = function (error) {
        console.error('Error:', error);
    };
    FetchApiClient.prototype.logInfo = function (message) {
        console.info('Info:', message);
    };
    // Public methods for GET, POST, PUT, DELETE
    FetchApiClient.prototype.get = function (url, options) {
        return this.request(url, __assign(__assign({}, options), { method: 'GET' }));
    };
    FetchApiClient.prototype.post = function (url, options) {
        return this.request(url, __assign(__assign({}, options), { method: 'POST' }));
    };
    FetchApiClient.prototype.put = function (url, options) {
        return this.request(url, __assign(__assign({}, options), { method: 'PUT' }));
    };
    FetchApiClient.prototype.delete = function (url, options) {
        return this.request(url, __assign(__assign({}, options), { method: 'DELETE' }));
    };
    FetchApiClient.instances = {};
    FetchApiClient.defaultInstance = null;
    return FetchApiClient;
}());
// Mocking for testing
function setMockResponse(url, response) {
    FetchApiClient.prototype.request = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, response];
            });
        });
    };
}
exports.default = FetchApiClient;
