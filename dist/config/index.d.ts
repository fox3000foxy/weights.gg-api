interface Config {
    API_URL: string;
    API_KEY: string;
    WEIGHTS_GG_COOKIE: string;
    PORT: number;
    MAX_QUEUE_SIZE: number;
    IMAGE_WIDTH: number;
    IMAGE_DIR: string;
    LORA_CACHE_FILE: string;
}
export declare const weightsConfig: Config;
export default weightsConfig;
export { Config };
