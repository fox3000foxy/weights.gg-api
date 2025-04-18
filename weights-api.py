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
        if not self.session:
            self.session = aiohttp.ClientSession()

        headers = {
            'Content-Type': 'application/json',
            'x-api-key': str(self.api_key)
        }
        
        url = self.endpoint + path
        
        if method == 'GET' and body:
            async with self.session.get(url, params=body, headers=headers) as response:
                return await response.json()
        else:
            async with self.session.request(method, url, json=body, headers=headers) as response:
                return await response.json()

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
        try:
            await self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

        data = await self.api_call(f'/status/{image_id}')
        return data

    async def get_quota(self) -> str:
        """
        Retrieves quota information
        """
        try:
            await self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

        data = await self.api_call('/quota')
        return data

    async def search_loras(self, query: str) -> Dict:
        """
        Searches for Lora models
        """
        try:
            await self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

        data = await self.api_call('/search-loras', body={'query': query})
        return data

    async def generate_image(self, query: str, lora_name: Optional[str] = None) -> Dict:
        """
        Generates an image based on parameters
        """
        try:
            await self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

        params = {'query': query, 'loraName': lora_name}
        data = await self.api_call('/generateImage', body=params)
        return data

    async def generate_progressive_image(self, query: str, lora_name: Optional[str] = None, 
                                      callback: Callable[[str], None] = lambda status: None) -> Dict:
        """
        Generates a progressive image with status updates
        """
        try:
            await self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

        result = await self.generate_image(query, lora_name)
        image_id = result['imageId']
        status_response = await self.get_status(image_id)
        status = status_response.get('status')
        last_modified_date = None
        old_modified_date = None

        while status != 'COMPLETED':
            await asyncio.sleep(0.1)  # Async wait for 100 milliseconds
            status_response = await self.get_status(image_id)
            status = status_response.get('status')
            last_modified_date = status_response.get('lastModifiedDate')
            
            if old_modified_date != last_modified_date:
                old_modified_date = last_modified_date
                callback(status)

        return status_response
