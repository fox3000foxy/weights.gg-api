<style>
    h1 {
        color: #6c5ce7;
        border-bottom: 2px solid #6c5ce7;
        padding-bottom: 0.3em;
    }
    h2 {
        color: #00b894;
        border-bottom: 1px solid #00b894;
        padding-bottom: 0.2em;
    }
    a {
        color: #0984e3;
        text-decoration: none;
    }
    a:hover {
        text-decoration: underline;
    }
    code {
        background-color: #f1f1f1;
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: monospace;
    }
    .feature-list li {
        color: #2d3436;
        margin-bottom: 8px;
    }
    .warning {
        background-color: #ffeaa7;
        border-left: 4px solid #fdcb6e;
        padding: 0.5em 1em;
        margin: 1em 0;
        color: #d63031;
    }
    .endpoint {
        background-color: #dfe6e9;
        border-radius: 5px;
        padding: 1em;
        margin-bottom: 1em;
    }
    .endpoint h3 {
        color: #e17055;
        margin-top: 0;
    }
    .parameter {
        color: #6c5ce7;
        font-weight: bold;
    }
    .response {
        color: #00b894;
        font-weight: bold;
    }
</style>

# Weights.gg Unofficial API

An automated image generation tool for Weights.gg, leveraging Puppeteer and an Express API to manage concurrent requests.

## ✨ Features

<div class="feature-list">
<ul>
    <li><strong>Concurrent Image Generation:</strong> Queue system for handling multiple image requests.</li>
    <li><strong>API Key Authentication:</strong> Secure endpoints.</li>
    <li><strong>Image Status Tracking:</strong> Real-time status updates (STARTING, PENDING, COMPLETED, FAILED).</li>
    <li><strong>LoRA Support:</strong> Add/remove LoRA models during generation.</li>
    <li><strong>Preview Updates:</strong> See previews as your image generates.</li>
    <li><strong>Robust Error Handling:</strong> Comprehensive error management and logging.</li>
    <li><strong>Health Check:</strong> Monitor the bot's status with a dedicated endpoint.</li>
</ul>
</div>

## ⚠️ Warning

<div class="warning">
Generated images expire after 10 minutes. Download promptly!
</div>

## 🚀 Endpoints

<div class="endpoint">
<h3>Health Check</h3>
<ul>
    <li><code>/health</code>: Checks server status.</li>
</ul>
</div>

<div class="endpoint">
<h3>Search LoRAs</h3>
<ul>
    <li><code>/search-loras</code>
        <ul>
            <li><span class="parameter">Query Parameter</span>:
                <ul>
                    <li><code>query</code> (required): URL-encoded search term.</li>
                </ul>
            </li>
            <li><span class="response">Response</span>: JSON array of LoRA objects:
                <ul>
                    <li><code>name</code>: LoRA name.</li>
                    <li><code>image</code>: LoRA image URL.</li>
                    <li><code>tags</code>: Array of tags.</li>
                </ul>
            </li>
        </ul>
    </li>
</ul>
</div>

<div class="endpoint">
<h3>Image Status</h3>
<ul>
    <li><code>/status/:imageId</code>
        <ul>
            <li><span class="parameter">Path Parameter</span>:
                <ul>
                    <li><code>imageId</code> (required): Image ID.</li>
                </ul>
            </li>
            <li><span class="response">Response</span>:
                <ul>
                    <li><code>status</code>: (STARTING, PENDING, COMPLETED, FAILED, NOT_FOUND).</li>
                    <li><code>prompt</code>: Generation prompt.</li>
                    <li><code>startTime</code>: Start time.</li>
                    <li><code>lastModifiedDate</code>: Last status update.</li>
                    <li><code>error</code>: Error message (if applicable).</li>
                </ul>
            </li>
        </ul>
    </li>
</ul>
</div>

<div class="endpoint">
<h3>Generate Image</h3>
<ul>
    <li><code>/generateImage</code>
        <ul>
            <li><span class="parameter">Query Parameters</span>:
                <ul>
                    <li><code>prompt</code> (required): URL-encoded prompt.</li>
                    <li><code>loraName</code> (optional): URL-encoded LoRA name.</li>
                </ul>
            </li>
            <li><span class="response">Response</span>:
                <ul>
                    <li><code>success</code>: Boolean.</li>
                    <li><code>imageId</code>: Unique ID.</li>
                    <li><code>imageUrl</code>: Image URL.</li>
                    <li><code>statusUrl</code>: Status check URL.</li>
                </ul>
            </li>
        </ul>
    </li>
</ul>
</div>

<div class="endpoint">
<h3>API Quota</h3>
<ul>
    <li><code>/quota</code>: Retrieves API quota information.
        <ul>
            <li><span class="response">Response</span>: Plain text quota details.</li>
        </ul>
    </li>
</ul>
</div>