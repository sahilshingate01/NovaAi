// CONFIG
let OPENROUTER_API_KEY = localStorage.getItem('openrouter_api_key') || "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";
let NVIDIA_IMAGE_KEY = localStorage.getItem('nvidia_image_key') || "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";
let CORS_PROXY = localStorage.getItem('cors_proxy') || "https://proxy.cors.sh/";
const CHAT_MODEL = "google/gemini-2.0-flash-001";
const IMAGE_MODEL = "stabilityai/stable-diffusion-3-medium";
let messages = [];
let currentMode = "chat";

// System prompt to keep responses concise and chatbot-like
const SYSTEM_PROMPT = {
    role: "system",
    content: "You are Nova AI. Speak like a real person in a casual chat. BE CONCISE. Never use long lists or menus. Never offer 'options to proceed'. Just answer the user directly and naturally. Keep most responses under 3 sentences unless asked for detail."
};

// API Base Detection (Local Proxy vs Netlify Function)
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? "http://localhost:3456/api" 
    : "/api";

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatModeBtn = document.getElementById('chatModeBtn');
const imageModeBtn = document.getElementById('imageModeBtn');
const typingIndicator = document.getElementById('typingIndicator');
const newChatBtn = document.querySelector('button.mt-6.w-full'); // New Chat button in sidebar

// Settings Elements
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const openrouterKeyInput = document.getElementById('nvidiaChatKeyInput');
const nvidiaImageKeyInput = document.getElementById('nvidiaImageKeyInput');
const corsProxyInput = document.getElementById('corsProxyInput');

// Mode Switcher
function switchMode(mode) {
    currentMode = mode;
    
    // Active/Inactive Classes
    const activeClass = "bg-[#00FFB2]/20 border border-[#00FFB2]/50 text-[#00FFB2] text-sm rounded-full px-4 py-1.5";
    const inactiveClass = "bg-white/8 border border-white/15 text-white/50 text-sm rounded-full px-4 py-1.5";

    if (chatModeBtn && imageModeBtn) {
        if (mode === "chat") {
            chatModeBtn.className = activeClass;
            imageModeBtn.className = inactiveClass;
            userInput.placeholder = "Message Nova AI...";
        } else {
            chatModeBtn.className = inactiveClass;
            imageModeBtn.className = activeClass;
            userInput.placeholder = "Describe an image to generate...";
        }
    }
}

// Simple markdown to HTML converter
function renderMarkdown(text) {
    let html = text
        // Escape HTML first
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        // Code blocks (```)
        .replace(/```([\s\S]*?)```/g, '<pre class="bg-white/5 rounded-lg p-3 my-2 text-xs overflow-x-auto"><code>$1</code></pre>')
        // Inline code (`)
        .replace(/`([^`]+)`/g, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-[#00FFB2] text-xs">$1</code>')
        // Bold (**text**)
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
        // Italic (*text*)
        .replace(/\*([^*]+)\*/g, '<em>$1</em>')
        // Headers (### h3, ## h2, # h1)
        .replace(/^### (.+)$/gm, '<h3 class="text-white font-semibold text-sm mt-3 mb-1">$1</h3>')
        .replace(/^## (.+)$/gm, '<h2 class="text-white font-semibold text-base mt-3 mb-1">$1</h2>')
        .replace(/^# (.+)$/gm, '<h1 class="text-white font-bold text-lg mt-3 mb-1">$1</h1>')
        // Unordered lists
        .replace(/^[\-\*] (.+)$/gm, '<li class="ml-4 list-disc">$1</li>')
        // Ordered lists  
        .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal">$1</li>')
        // Line breaks (double newline = paragraph break)
        .replace(/\n\n/g, '</p><p class="mt-2">')
        // Single newlines
        .replace(/\n/g, '<br>');
    
    // Wrap consecutive <li> items
    html = html.replace(/(<li[^>]*>.*?<\/li>(?:<br>)?)+/g, (match) => {
        return '<ul class="my-2 space-y-1">' + match.replace(/<br>/g, '') + '</ul>';
    });
    
    return '<p>' + html + '</p>';
}

// Append Message to UI
function appendMessage(role, content, type = "text") {
    const messageDiv = document.createElement('div');
    messageDiv.className = `max-w-[65%] mb-4 message-fade-in ${role === 'user' ? 'self-end' : 'self-start flex'}`;
    
    let innerHTML = '';
    
    if (role === 'bot') {
        innerHTML += `
            <div class="bg-[#00FFB2]/20 border border-[#00FFB2]/40 w-7 h-7 rounded-full flex items-center justify-center text-xs mr-2 shrink-0 mt-1">🤖</div>
            <div class="glass px-4 py-3 rounded-2xl rounded-tl-sm text-white text-sm leading-relaxed">
        `;
    } else {
        messageDiv.className = 'max-w-[55%] mb-4 message-fade-in self-end';
        innerHTML += `<div class="bg-[#00FFB2]/15 border border-[#00FFB2]/25 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-3">`;
    }

    if (type === "text") {
        const textContent = typeof content === 'object' ? content.text : content;
        const reasoning = typeof content === 'object' ? content.reasoning : null;

        if (reasoning) {
            innerHTML += `
                <div class="mb-2 p-3 bg-white/5 border-l-2 border-[#00FFB2]/30 rounded-r-lg">
                    <div class="text-[10px] uppercase tracking-widest text-[#00FFB2]/60 mb-1 font-bold">Thought Process</div>
                    <div class="text-xs text-white/50 italic leading-relaxed">${renderMarkdown(reasoning)}</div>
                </div>
            `;
        }
        innerHTML += `<div class="chat-content">${renderMarkdown(textContent)}</div>`;
    } else if (type === "image") {
        innerHTML += `<img src="${content}" alt="Generated AI" class="max-w-[300px] w-full rounded-xl mt-2 border border-white/10 shadow-lg">`;
    }

    innerHTML += `</div>`;
    messageDiv.innerHTML = innerHTML;
    
    chatMessages.appendChild(messageDiv);
    
    // Trigger fade-in
    setTimeout(() => messageDiv.classList.add('message-visible'), 10);
    
    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Typing Indicator
function showTyping() {
    typingIndicator.classList.remove('hidden');
    chatMessages.appendChild(typingIndicator); // Keep it at the end
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTyping() {
    typingIndicator.classList.add('hidden');
}

// APIs
async function sendChat(text) {
    if (!OPENROUTER_API_KEY) {
        appendMessage("bot", "⚠️ OpenRouter API Key is missing. Please add it in Settings (⚙️).");
        return;
    }

    messages.push({ role: "user", content: text });
    showTyping();

    try {
        // Build messages with system prompt
        const apiMessages = [SYSTEM_PROMPT, ...messages];

        // On production (Netlify), we prefer the server-side Environment Variable.
        // We only send the header if the user has provided a custom key in the settings.
        const headers = { "Content-Type": "application/json" };
        const storedKey = localStorage.getItem('openrouter_api_key');
        if (storedKey) {
            headers["Authorization"] = `Bearer ${storedKey}`;
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            // Local dev fallback
            headers["Authorization"] = `Bearer ${OPENROUTER_API_KEY}`;
        }

        const response = await fetch(`${API_BASE}/chat`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: apiMessages,
                temperature: 0.7,
                top_p: 0.9,
                max_tokens: 512,
                stream: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText.substring(0, 300)}`);
        }

        const data = await response.json();
        const choice = data.choices[0];
        const replyText = choice.message.content;
        
        // Support reasoning content if provided by OpenRouter (e.g. R1 models)
        const reasoningText = choice.message.reasoning || choice.message.reasoning_content || null;

        messages.push({ role: "assistant", content: replyText });
        hideTyping();
        
        appendMessage("bot", { text: replyText, reasoning: reasoningText });
    } catch (error) {
        console.error("Chat Error:", error);
        hideTyping();
        const apiHelp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? "Make sure the proxy server is running: node proxy-server.js"
            : "Check your Netlify Environment Variables.";
        appendMessage("bot", `⚠️ Error: ${error.message}. ${apiHelp}`);
    }
}

async function generateImage(prompt) {
    if (!NVIDIA_IMAGE_KEY) {
        appendMessage("bot", "⚠️ Nvidia Image API Key is missing. Please add it in Settings (⚙️).");
        return;
    }

    showTyping();

    try {
        const headers = { 
            "Content-Type": "application/json",
            "Accept": "application/json"
        };
        const storedKey = localStorage.getItem('nvidia_image_key');
        if (storedKey) {
            headers["Authorization"] = `Bearer ${storedKey}`;
        } else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            headers["Authorization"] = `Bearer ${NVIDIA_IMAGE_KEY}`;
        }

        const response = await fetch(`${API_BASE}/image`, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                prompt: prompt,
                cfg_scale: 5,
                aspect_ratio: "1:1",
                seed: 0,
                steps: 50,
                negative_prompt: "",
                mode: "text-to-image",
                model: "sd3"
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("Image API error response:", errorText);
            throw new Error(`API Error ${response.status}: ${errorText.substring(0, 300)}`);
        }

        const data = await response.json();
        console.log("Image API response keys:", Object.keys(data));

        let imageUrl = null;
        if (data.image) {
            imageUrl = `data:image/jpeg;base64,${data.image}`;
        } else if (data.artifacts && data.artifacts[0] && data.artifacts[0].base64) {
            imageUrl = `data:image/png;base64,${data.artifacts[0].base64}`;
        } else if (data.data && data.data[0] && data.data[0].b64_json) {
            imageUrl = `data:image/png;base64,${data.data[0].b64_json}`;
        }

        if (!imageUrl) {
            console.error("Unexpected response format:", JSON.stringify(data).substring(0, 500));
            throw new Error("Unexpected response format from Image API. Check console for details.");
        }

        hideTyping();
        appendMessage("bot", imageUrl, "image");
    } catch (error) {
        console.error("Image Error:", error);
        hideTyping();
        const apiHelp = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? "Make sure the proxy server is running: node proxy-server.js"
            : "Check your Netlify Environment Variables.";
        appendMessage("bot", `⚠️ Image generation failed: ${error.message}. ${apiHelp}`);
    }
}

// Main Send Action
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    appendMessage("user", text);
    userInput.value = "";
    userInput.style.height = "auto";

    if (currentMode === "image") {
        await generateImage(text);
    } else {
        await sendChat(text);
    }
}

// New Chat Function
function startNewChat() {
    messages = [];
    chatMessages.innerHTML = '';
    appendMessage("bot", "👋 Session cleared! How can I help you now?");
}

// Event Listeners
if (sendBtn) sendBtn.onclick = sendMessage;
if (newChatBtn) newChatBtn.onclick = startNewChat;

if (userInput) {
    userInput.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    userInput.oninput = () => {
        userInput.style.height = "auto";
        userInput.style.height = Math.min(userInput.scrollHeight, 120) + "px";
    };
}

if (chatModeBtn) chatModeBtn.onclick = () => switchMode("chat");
if (imageModeBtn) imageModeBtn.onclick = () => switchMode("image");

// Settings Logic
if (settingsBtn) {
    settingsBtn.onclick = () => {
        openrouterKeyInput.value = OPENROUTER_API_KEY;
        nvidiaImageKeyInput.value = NVIDIA_IMAGE_KEY;
        corsProxyInput.value = CORS_PROXY;
        settingsModal.classList.add('active');
    };
}

if (closeSettingsBtn) {
    closeSettingsBtn.onclick = () => {
        settingsModal.classList.remove('active');
    };
}

if (saveSettingsBtn) {
    saveSettingsBtn.onclick = () => {
        OPENROUTER_API_KEY = openrouterKeyInput.value.trim();
        NVIDIA_IMAGE_KEY = nvidiaImageKeyInput.value.trim();
        CORS_PROXY = corsProxyInput.value.trim();
        
        if (CORS_PROXY && !CORS_PROXY.endsWith('/')) {
            // Some proxies need the URL directly appended; shcors generally handles it but ends with / is safer
        }

        localStorage.setItem('openrouter_api_key', OPENROUTER_API_KEY);
        localStorage.setItem('nvidia_image_key', NVIDIA_IMAGE_KEY);
        localStorage.setItem('cors_proxy', CORS_PROXY);
        
        settingsModal.classList.remove('active');
        appendMessage("bot", "✅ Settings saved successfully!");
    };
}

// Close modal on click outside
window.onclick = (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.remove('active');
    }
};

// Initial State
window.onload = () => {
    switchMode("chat");
    appendMessage("bot", "👋 Hello! I'm Nova AI. Ask me anything or switch to Generate Image mode to create images.");
};
