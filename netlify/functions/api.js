const https = require('https');

exports.handler = async (event) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers };
    }

    if (event.httpMethod !== 'POST') {
        return { 
            statusCode: 405, 
            headers, 
            body: JSON.stringify({ error: 'Method not allowed' }) 
        };
    }

    const path = event.path.split('/').pop(); // 'chat' or 'image'
    let targetUrl;

    if (path === 'chat') {
        // Now using OpenRouter for Chat
        targetUrl = 'https://openrouter.ai/api/v1/chat/completions';
    } else if (path === 'image') {
        targetUrl = 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium';
    } else {
        return { statusCode: 404, headers, body: 'Not Found' };
    }

    // Get key from headers or fallback to environment variables
    let clientKey = event.headers.authorization || event.headers.Authorization;
    
    // If clientKey is empty or just "Bearer ", use the server-side fallback
    if (!clientKey || clientKey.trim() === 'Bearer' || clientKey.trim() === 'Bearer undefined' || clientKey.trim() === 'Bearer null') {
        const envChatKey = process.env.OPENROUTER_API_KEY;
        const envImageKey = process.env.VITE_NVIDIA_IMAGE_KEY || process.env.NVIDIA_IMAGE_KEY;
        
        if (path === 'chat' && envChatKey) {
            clientKey = `Bearer ${envChatKey}`;
        } else if (path === 'image' && envImageKey) {
            clientKey = `Bearer ${envImageKey}`;
        } else {
            clientKey = null;
        }
    }

    const authHeader = clientKey;

    if (!authHeader) {
        console.error(`[ERROR] No API key found for path: ${path}`);
        return { 
            statusCode: 401, 
            headers, 
            body: JSON.stringify({ error: `Missing API Key for ${path}. Please set it in Netlify Environment Variables.` }) 
        };
    }

    // Use actual origin or host as referer
    const siteUrl = event.headers.origin || `https://${event.headers.host}`;

    try {
        const body = event.body;
        
        const responseData = await new Promise((resolve, reject) => {
            const url = new URL(targetUrl);
            const options = {
                hostname: url.hostname,
                path: url.pathname + url.search,
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'HTTP-Referer': siteUrl,
                    'X-Title': 'Nova AI'
                }
            };

            const req = https.request(options, (res) => {
                let chunks = '';
                res.on('data', (d) => chunks += d);
                res.on('end', () => resolve({
                    statusCode: res.statusCode,
                    body: chunks,
                    contentType: res.headers['content-type']
                }));
            });

            req.on('error', reject);
            req.write(body);
            req.end();
        });

        return {
            statusCode: responseData.statusCode,
            headers: {
                ...headers,
                'Content-Type': responseData.contentType
            },
            body: responseData.body
        };

    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ error: error.message })
        };
    }
};
