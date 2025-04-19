import os
import time
import asyncio
import aiohttp
from typing import Optional, Callable, Any, Dict

class WeightsApi:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.endpoint = os.getenv('WEIGHTS_UNOFFICIAL_ENDPOINT', 'http://localhost:3000')
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def api_call(self, path: str, method: str = 'GET', body: Optional[Dict] = None) -> Dict:
        """
        Makes an async HTTP request to the API endpoint
        """
        if not self.session or self.session.closed:
            self.session = aiohttp.ClientSession()

        headers = {
            'Content-Type': 'application/json',
            'x-api-key': str(self.api_key)
        }
        
        url = self.endpoint + path
        
        try:
            if method == 'GET' and body:
                async with self.session.get(url, params=body, headers=headers) as response:
                    response.raise_for_status()
                    return await response.json()
            else:
                async with self.session.request(method, url, json=body, headers=headers) as response:
                    response.raise_for_status()
                    return await response.json()
        except aiohttp.ClientError as e:
            raise Exception(f"Weights API Error: {e}")

    async def _check_health(self):
        """
        Checks the health of the API and raises an exception if it's not reachable.
        """
        try:
            await self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

    async def get_health_data(self) -> Dict:
        """
        Retrieves health status of the API
        """
        data = await self.api_call('/health')
        return data

    async def get_status(self, image_id: str) -> Dict:
        """
        Gets the status of a specific image
        """
        await self._check_health()
        data = await self.api_call(f'/status/{image_id}')
        return data

    async def get_quota(self) -> Dict:
        """
        Retrieves quota information
        """
        await self._check_health()
        data = await self.api_call('/quota')
        return data

    async def search_loras(self, query: str) -> Dict:
        """
        Searches for Lora models
        """
        await self._check_health()
        data = await self.api_call('/search-loras', method='POST', body={'query': query})
        return data

    async def generate_image(self, query: str, lora_name: Optional[str] = None) -> Dict:
        """
        Generates an image based on parameters
        """
        await self._check_health()
        params = {'query': query, 'loraName': lora_name}
        data = await self.api_call('/generateImage', method='POST', body=params)
        return data

    async def generate_progressive_image(self, query: str, lora_name: Optional[str] = None, 
                                      callback: Callable[[str], None] = lambda status: None) -> Dict:
        """
        Generates a progressive image with status updates
        """
        await self._check_health()

        result = await self.generate_image(query, lora_name)
        image_id = result['imageId']
        
        while True:
            status_response = await self.get_status(image_id)
            status = status_response.get('status')
            callback(status)
            
            if status == 'COMPLETED':
                break
            
            await asyncio.sleep(1)

        return status_response
