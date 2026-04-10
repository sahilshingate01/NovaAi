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
        targetUrl = 'https://integrate.api.nvidia.com/v1/chat/completions';
    } else if (path === 'image') {
        targetUrl = 'https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium';
    } else {
        return { statusCode: 404, headers, body: 'Not Found' };
    }

    const authHeader = event.headers.authorization || event.headers.Authorization;

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
                    'Accept': 'application/json'
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
