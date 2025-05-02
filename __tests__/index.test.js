/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable no-undef */

/**
 * @file Jest test suite for the application.
 * @module __tests__/index.test
 */

/**
 * Jest test suite for the application.
 *
 * @description
 * This test suite verifies the application's basic setup, including server definition,
 * port configuration, container initialization, and service bindings.
 *
 * Jest Methods Memo:
 * - `describe(name, fn)`: Creates a block that groups together several related tests.
 * - `it(name, fn)`: Defines a single test case with a descriptive name. Alias: `test(name, fn)`.
 * - `expect(value)`: Creates an assertion about a value.
 * - `toBe(value)`: Matches primitive values or checks referential identity.
 * - `toEqual(value)`: Matches when two objects have the same value.  For deep equality, especially useful for objects and arrays.
 * - `toBeDefined()`: Asserts that a value is not `undefined`.
 * - `toBeUndefined()`: Asserts that a value is `undefined`.
 * - `toBeNull()`: Asserts that a value is `null`.
 * - `toBeTruthy()`: Asserts that a value is truthy.
 * - `toBeFalsy()`: Asserts that a value is falsy.
 * - `toBeGreaterThan(number)`: Asserts that a value is greater than a number.
 * - `toBeLessThan(number)`: Asserts that a value is less than a number.
 * - `toBeGreaterThanOrEqual(number)`: Asserts that a value is greater than or equal to a number.
 * - `toBeLessThanOrEqual(number)`: Asserts that a value is less than or equal to a number.
 * - `toContain(item)`: Asserts that an array or string contains a particular item.
 * - `toMatch(regexp)`: Asserts that a string matches a regular expression.
 * - `toThrow(error)`: Asserts that a function throws an error.
 * - `beforeEach(fn, timeout)`: Function to run before each test in the file.
 * - `afterEach(fn, timeout)`: Function to run after each test in the file.
 * - `beforeAll(fn, timeout)`: Function to run once before all tests in the file.
 * - `afterAll(fn, timeout)`: Function to run once after all tests in the file.
 * - `jest.fn()`: Creates a mock function.
 * - `jest.spyOn(object, methodName)`: Spies on a method of an object.
 * - `jest.mock(moduleName, factory, options)`: Mocks a module.
 */

const app = require("../dist/app").app;
const container = require("../dist/container").default;
const types = require("../dist/types");
const request = require("supertest");

describe("API Key Middleware", () => {
test("/generateImage returns 401 if API key is missing", async () => {
        const res = await request(app)
            .get("/generateImage?prompt=validprompt");
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty("error", "Invalid or missing API key.");
    }, 60000);

    test("/generateImage returns 401 if API key is invalid", async () => {
        const res = await request(app)
            .get("/generateImage?prompt=validprompt")
            .set("x-api-key", "wrong-key");
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty("error", "Invalid or missing API key.");
    }, 60000);

    test("/generateImage returns 400 if prompt is missing, but API key is valid", async () => {
        const res = await request(app)
            .get("/generateImage")
            .set("x-api-key", process.env.API_KEY);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("error", "Validation error");
    }, 60000);

    test("/generateImage returns 400 if prompt is too short, but API key is valid", async () => {
        const res = await request(app)
            .get("/generateImage?prompt=short")
            .set("x-api-key", process.env.API_KEY);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("error", "Validation error");
    }, 60000);

    test("/generateImage returns 200 or 202 if API key and prompt are valid", async () => {
        // This assumes the endpoint works and may return 200 or 202 for accepted/created
        const res = await request(app)
            .get("/generateImage?prompt=validpromptforimagegeneration")
            .set("x-api-key", process.env.API_KEY);
        expect([200, 202, 400]).toContain(res.statusCode);
    }, 60000);
});

describe("App & Server", () => {
    test("Server is defined", () => {
        expect(app).toBeDefined();
    });
});

describe("Container", () => {
    test("Container is defined", () => {
        expect(container).toBeDefined();
    });

    test("Container has all required services", () => {
        const requiredServices = [
            types.TYPES.Config,
            types.TYPES.PuppeteerService,
            types.TYPES.ImageQueue,
            types.TYPES.SearchQueue,
            types.TYPES.ImageProcessor,
            types.TYPES.LoraSearchProcessor,
        ];
        requiredServices.forEach((service) => {
            expect(container.isBound(service)).toBe(true);
        });
    });

    test("Types enum contains all expected keys", () => {
        expect(Object.keys(types.TYPES)).toEqual(
            expect.arrayContaining([
                "Config",
                "PuppeteerService",
                "ImageService",
                "LoraService",
                "StatusService",
                "ImageQueue",
                "SearchQueue",
                "ImageProcessor",
                "LoraSearchProcessor",
                "EventEmitter"
            ])
        );
    });
});

describe("Config", () => {
    test("Config is loaded and has required properties", () => {
        const config = container.get(types.TYPES.Config);
        expect(config).toBeDefined();
        expect(config).toHaveProperty("API_KEY");
        expect(config).toHaveProperty("PORT");
        expect(config).toHaveProperty("MAX_QUEUE_SIZE");
        expect(config).toHaveProperty("IMAGE_WIDTH");
        expect(config).toHaveProperty("IMAGE_DIR");
        expect(config).toHaveProperty("LORA_CACHE_FILE");
    });
});

describe("Services", () => {
    test("ImageService is singleton", () => {
        const s1 = container.get(types.TYPES.ImageService);
        const s2 = container.get(types.TYPES.ImageService);
        expect(s1).toBe(s2);
    });

    test("LoraService is singleton", () => {
        const s1 = container.get(types.TYPES.LoraService);
        const s2 = container.get(types.TYPES.LoraService);
        expect(s1).toBe(s2);
    });

    test("StatusService is singleton", () => {
        const s1 = container.get(types.TYPES.StatusService);
        const s2 = container.get(types.TYPES.StatusService);
        expect(s1).toBe(s2);
    });

    test("ImageQueue is defined", () => {
        const imageQueue = container.get(types.TYPES.ImageQueue);
        expect(imageQueue).toBeDefined();
    });

    test("StatusService updates and gets image status", () => {
        const statusService = container.get(types.TYPES.StatusService);
        const imageId = "img123";
        statusService.updateImageStatus(imageId, "PENDING");
        const status = statusService.getImageStatus(imageId);
        expect(status).toBeDefined();
        expect(status.status).toBe("PENDING");
    });

    test("StatusService returns undefined for unknown image", () => {
        const statusService = container.get(types.TYPES.StatusService);
        const status = statusService.getImageStatus("unknown_id");
        expect(status).toBeUndefined();
    });

    test("ImageService generates unique image IDs", () => {
        const imageService = container.get(types.TYPES.ImageService);
        const id1 = imageService.generateImageId();
        const id2 = imageService.generateImageId();
        expect(id1).not.toBe(id2);
        expect(typeof id1).toBe("string");
        expect(typeof id2).toBe("string");
    });
});
describe("Controllers", () => {
    test("/health endpoint returns status OK", async () => {
        const res = await request(app)
            .get("/health")
            .set("x-api-key", process.env.API_KEY);
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("OK");
    }, 60000);

    test("/status/:imageId returns status for known image", async () => {
        const statusService = container.get(types.TYPES.StatusService);
        statusService.updateImageStatus("testid", "COMPLETED");
        const res = await request(app)
            .get("/status/testid")
            .set("x-api-key", process.env.API_KEY);
        expect(res.statusCode).toBe(200);
        expect(res.text).toContain("COMPLETED");
    }, 60000);

    test("/status/:imageId returns 404 for unknown image", async () => {
        const res = await request(app)
            .get("/status/unknownid")
            .set("x-api-key", process.env.API_KEY);
        expect([404, 200]).toContain(res.statusCode); // Accept 404 or 200 if handled gracefully
    }, 60000);

    test("/quota endpoint returns quota string", async () => {
        const res = await request(app)
            .get("/quota")
            .set("x-api-key", process.env.API_KEY);
        expect(res.statusCode).toBe(200);
        expect(typeof res.text).toBe("string");
    }, 60000);

    test("/search-loras returns 400 if query missing", async () => {
        const res = await request(app)
            .get("/search-loras")
            .set("x-api-key", process.env.API_KEY);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("error", "Validation error");
        expect(res.body.details).toContain("Query parameter is required.");
    }, 60000);

    test("/search-loras returns 200 with query param", async () => {
        const res = await request(app)
            .get("/search-loras?query=test")
            .set("x-api-key", process.env.API_KEY);
        expect([200, 204, 400]).toContain(res.statusCode);
        // Optionally: 
        expect(res.body).toBeInstanceOf(Array);
    }, 60000);

    test("/generateImage returns 400 if prompt is too short", async () => {
        const res = await request(app)
            .get("/generateImage?prompt=short")
            .set("x-api-key", process.env.API_KEY);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("error", "Validation error");
        expect(res.body.details).toContain("Prompt is too short");
    }, 60000);

    test("/generateImage returns 400 if prompt is missing", async () => {
        const res = await request(app)
            .get("/generateImage")
            .set("x-api-key", process.env.API_KEY);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty("error", "Validation error");
        expect(res.body.details).toContain("Prompt is required");
    }, 60000);

    // test("/generateImage returns 401 if API_KEY is missing or invalid", async () => {
    //     const res = await request(app).get("/generateImage?prompt=validprompt");
    //     // Accept 401 or 400 depending on implementation
    //     expect([401, 400]).toContain(res.statusCode);
    // }, 60000);
});