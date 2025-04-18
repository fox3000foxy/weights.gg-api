import os
import time
import requests
from typing import Optional, Callable, Any, Dict

class WeightsApi:
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.endpoint = os.getenv('WEIGHTS_UNOFFICIAL_ENDPOINT', 'http://localhost:3000')

    def api_call(self, path: str, method: str = 'GET', body: Optional[Dict] = None) -> requests.Response:
        """
        Makes an HTTP request to the API endpoint
        """
        headers = {
            'Content-Type': 'application/json',
            'x-api-key': str(self.api_key)
        }
        
        url = self.endpoint + path
        
        if method == 'GET' and body:
            response = requests.get(url, params=body, headers=headers)
        else:
            response = requests.request(method, url, json=body, headers=headers)
            
        return response

    def get_health_data(self) -> Dict:
        """
        Retrieves health status of the API
        """
        response = self.api_call('/health')
        data = response.json()
        if response.ok:
            return data
        raise Exception(f"Error: {response.status_code} - {data}")

    def get_status(self, image_id: str) -> Dict:
        """
        Gets the status of a specific image
        """
        try:
            self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

        response = self.api_call(f'/status/{image_id}')
        data = response.json()
        if response.ok:
            return data
        raise Exception(f"Error: {response.status_code} - {data}")

    def get_quota(self) -> str:
        """
        Retrieves quota information
        """
        try:
            self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

        response = self.api_call('/quota')
        if response.ok:
            return response.text
        raise Exception(f"Error: {response.status_code} - {response.text}")

    def search_loras(self, query: str) -> Dict:
        """
        Searches for Lora models
        """
        try:
            self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

        response = self.api_call('/search-loras', body={'query': query})
        data = response.json()
        if response.ok:
            return data
        raise Exception(f"Error: {response.status_code} - {data}")

    def generate_image(self, query: str, lora_name: Optional[str] = None) -> Dict:
        """
        Generates an image based on parameters
        """
        try:
            self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

        params = {'query': query, 'loraName': lora_name}
        response = self.api_call('/generateImage', body=params)
        data = response.json()
        if response.ok:
            return data
        raise Exception(f"Error: {response.status_code} - {data}")

    def generate_progressive_image(self, query: str, lora_name: Optional[str] = None, 
                                 callback: Callable[[str], None] = lambda status: None) -> Dict:
        """
        Generates a progressive image with status updates
        """
        try:
            self.get_health_data()
        except Exception:
            raise Exception("Weights API Error: The API is not reachable. Please check your connection or the API status.")

        result = self.generate_image(query, lora_name)
        image_id = result['imageId']
        status_response = self.get_status(image_id)
        status = status_response.get('status')
        last_modified_date = None
        old_modified_date = None

        while status != 'COMPLETED':
            time.sleep(0.1)  # Wait for 100 milliseconds
            status_response = self.get_status(image_id)
            status = status_response.get('status')
            last_modified_date = status_response.get('lastModifiedDate')
            
            if old_modified_date != last_modified_date:
                old_modified_date = last_modified_date
                callback(status)

        return status_response

