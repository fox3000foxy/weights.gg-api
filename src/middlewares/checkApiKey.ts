import { Request, Response, NextFunction } from 'express';

export function checkApiKey(req: Request, res: Response, next: NextFunction) {
    const apiKey = process.env.API_KEY;
    const headerKey = req.header('x-api-key');

    if (!apiKey) {
        console.warn('API key is not set in environment variables.');
        next();
        return;
    }

    if (headerKey !== apiKey) {
        return res.status(401).json({ error: 'Invalid or missing API key.' });
    }

    next();
}