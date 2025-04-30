"use strict";
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
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
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
exports.__esModule = true;
exports.WeightsApi = exports.ImageStatus = exports.HttpMethod = void 0;
var node_fetch_1 = require("node-fetch");
var HttpMethod;
(function (HttpMethod) {
    HttpMethod["GET"] = "GET";
    HttpMethod["POST"] = "POST";
})(HttpMethod = exports.HttpMethod || (exports.HttpMethod = {}));
var ImageStatus;
(function (ImageStatus) {
    ImageStatus["PENDING"] = "PENDING";
    ImageStatus["PROCESSING"] = "PROCESSING";
    ImageStatus["COMPLETED"] = "COMPLETED";
    ImageStatus["FAILED"] = "FAILED";
})(ImageStatus = exports.ImageStatus || (exports.ImageStatus = {}));
var WeightsApi = /** @class */ (function () {
    function WeightsApi(apiKey, endpoint) {
        if (endpoint === void 0) { endpoint = null; }
        var _this = this;
        this.apiKey = null;
        this.endpoint = null;
        /**
         * Gets the status of a specific image.
         * @param params - Object containing imageId.
         * @returns Promise with status information.
         */
        this.getStatus = function (params) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.callWithHealthCheck(function () {
                        return _this.apiCall("/status/" + params.imageId, HttpMethod.GET).then(function (response) { return response.json(); });
                    })];
            });
        }); };
        /**
         * Retrieves quota information.
         * @returns Promise with quota data.
         */
        this.getQuota = function () { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.callWithHealthCheck(function () {
                        return _this.apiCall("/quota", HttpMethod.GET).then(function (response) {
                            return response.text();
                        });
                    })];
            });
        }); };
        /**
         * Searches for Lora models.
         * @param params - Object containing search query.
         * @returns Promise with search results.
         */
        this.searchLoras = function (params) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.callWithHealthCheck(function () {
                        return _this.apiCall("/search-loras", HttpMethod.GET, params).then(function (response) {
                            return response.json();
                        });
                    })];
            });
        }); };
        /**
         * Generates an image based on parameters.
         * @param params - Object containing query and optional loraName.
         * @returns Promise with generation results.
         */
        this.generateImage = function (params) { return __awaiter(_this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                return [2 /*return*/, this.callWithHealthCheck(function () {
                        return _this.apiCall("/generateImage", HttpMethod.GET, params).then(function (response) {
                            return response.json();
                        });
                    })];
            });
        }); };
        /**
         * Generates a progressive image based on parameters.
         * @param params - Object containing query and optional loraName.
         * @param callback - Function to call with status updates.
         * @returns Promise with generation results.
         */
        this.generateProgressiveImage = function (params, callback) {
            if (callback === void 0) { callback = function (status) {
                return status;
            }; }
            return __awaiter(_this, void 0, void 0, function () {
                var imageId, statusResponse, status, oldModifiedDate, statusResponse_1, status_1, lastModifiedDate, error;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.getHealthData()];
                        case 1:
                            _a.sent();
                            return [4 /*yield*/, this.generateImage(params)];
                        case 2:
                            imageId = (_a.sent()).imageId;
                            return [4 /*yield*/, this.getStatus({ imageId: imageId })];
                        case 3:
                            statusResponse = _a.sent();
                            status = statusResponse.status;
                            callback(status, { imageId: imageId });
                            if (status === ImageStatus.COMPLETED) {
                                return [2 /*return*/, statusResponse];
                            }
                            oldModifiedDate = null;
                            _a.label = 4;
                        case 4:
                            if (!true) return [3 /*break*/, 7];
                            return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 100); })];
                        case 5:
                            _a.sent(); // Wait for 100 milliseconds
                            return [4 /*yield*/, this.getStatus({ imageId: imageId })];
                        case 6:
                            statusResponse_1 = _a.sent();
                            status_1 = statusResponse_1.status;
                            lastModifiedDate = statusResponse_1.lastModifiedDate || null;
                            error = statusResponse_1.error || null;
                            if (oldModifiedDate !== lastModifiedDate) {
                                oldModifiedDate = lastModifiedDate;
                                callback(status_1, { imageId: imageId });
                            }
                            if (status_1 === ImageStatus.COMPLETED) {
                                return [3 /*break*/, 7];
                            }
                            if (status_1 === ImageStatus.FAILED) {
                                throw new Error("Image generation failed: " + error);
                            }
                            return [3 /*break*/, 4];
                        case 7: return [2 /*return*/, statusResponse];
                    }
                });
            });
        };
        this.endpoint = endpoint;
        this.apiKey = apiKey;
    }
    /**
     * Makes an HTTP request to the API endpoint.
     * @param path - The API endpoint path.
     * @param method - The HTTP method (default: 'GET').
     * @param body - The request body (optional).
     * @returns Promise<Response>
     */
    WeightsApi.prototype.apiCall = function (path, method, body) {
        if (method === void 0) { method = HttpMethod.GET; }
        if (body === void 0) { body = null; }
        return __awaiter(this, void 0, void 0, function () {
            var options, url, params, key, response;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        options = {
                            method: method,
                            headers: {
                                "Content-Type": "application/json",
                                "x-api-key": "".concat(this.apiKey)
                            }
                        };
                        url = this.endpoint + path;
                        if (method === HttpMethod.GET && body) {
                            params = new URLSearchParams();
                            for (key in body) {
                                if (Object.prototype.hasOwnProperty.call(body, key)) {
                                    if (body[key] === null) {
                                        continue;
                                    }
                                    params.append(key, String(body[key]));
                                }
                            }
                            url += "?" + params.toString();
                        }
                        else if (body) {
                            options.body = JSON.stringify(body);
                        }
                        return [4 /*yield*/, (0, node_fetch_1["default"])(url, options)];
                    case 1:
                        response = _a.sent();
                        if (response.ok) {
                            return [2 /*return*/, response];
                        }
                        else {
                            throw new Error("Error: ".concat(response.status, " - ").concat(JSON.stringify(response)));
                        }
                        return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Retrieves health status of the API.
     * @returns Promise with health data.
     */
    WeightsApi.prototype.getHealthData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var response, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.apiCall("/health", HttpMethod.GET)];
                    case 1:
                        response = _a.sent();
                        return [4 /*yield*/, response.json()];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_1 = _a.sent();
                        throw new Error("Weights API Error: The API is not reachable. Please check your connection or the API status. ".concat(error_1));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Wraps API calls with health check
     * @param apiCall - The API call to make
     * @returns Promise<T>
     */
    WeightsApi.prototype.callWithHealthCheck = function (apiCall) {
        return __awaiter(this, void 0, void 0, function () {
            var error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.getHealthData()];
                    case 1:
                        _a.sent();
                        return [4 /*yield*/, apiCall()];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_2 = _a.sent();
                        if (error_2 instanceof Error) {
                            throw new Error("Weights API Error: The API is not reachable. Please check your connection or the API status.");
                        }
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return WeightsApi;
}());
exports.WeightsApi = WeightsApi;
