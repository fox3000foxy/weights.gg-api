import { Page } from 'rebrowser-puppeteer-core';
import { Config } from '../config';
import { LoraResult } from 'types';
export declare class LoraService {
    config: Config;
    loraSearchCache: Map<string, LoraResult[]>;
    constructor(config: Config);
    addLora(loraName: string, page: Page): Promise<boolean>;
    removeLora(page: Page): Promise<void>;
    searchLoras(loraName: string, page: Page): Promise<LoraResult[]>;
    private loadLoraCache;
    saveLoraCache(): void;
}
export default LoraService;
