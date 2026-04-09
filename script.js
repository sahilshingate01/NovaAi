// CONFIG
let NVIDIA_CHAT_KEY = localStorage.getItem('nvidia_chat_key') || "";
let NVIDIA_IMAGE_KEY = localStorage.getItem('nvidia_image_key') || "";
const CHAT_MODEL = "nvidia/nemotron-3-super-120b-a12b";
const IMAGE_MODEL = "stabilityai/stable-diffusion-3-medium";
let messages = [];
let currentMode = "chat";

// DOM Elements
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const chatModeBtn = document.getElementById('chatModeBtn');
const imageModeBtn = document.getElementById('imageModeBtn');
const typingIndicator = document.getElementById('typingIndicator');

// Settings Elements
const settingsModal = document.getElementById('settingsModal');
const settingsBtn = document.getElementById('settingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const nvidiaChatKeyInput = document.getElementById('nvidiaChatKeyInput');
const nvidiaImageKeyInput = document.getElementById('nvidiaImageKeyInput');

// Mode Switcher
function switchMode(mode) {
    currentMode = mode;
    
    // Active/Inactive Classes
    const activeClass = "bg-[#00FFB2]/20 border border-[#00FFB2]/50 text-[#00FFB2] text-sm rounded-full px-4 py-1.5";
    const inactiveClass = "bg-white/8 border border-white/15 text-white/50 text-sm rounded-full px-4 py-1.5";

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

// Append Message to UI
function appendMessage(role, content, type = "text") {
    const messageDiv = document.createElement('div');
    messageDiv.className = `max-w-[75%] mb-4 message-fade-in ${role === 'user' ? 'self-end' : 'self-start flex'}`;
    
    let innerHTML = '';
    
    if (role === 'bot') {
        innerHTML += `
            <div class="bg-[#00FFB2]/20 border border-[#00FFB2]/40 w-7 h-7 rounded-full flex items-center justify-center text-xs mr-2 shrink-0">🤖</div>
            <div class="glass px-4 py-3 rounded-2xl rounded-tl-sm text-white text-sm">
        `;
    } else {
        messageDiv.className = 'max-w-[70%] mb-4 message-fade-in self-end';
        innerHTML += `<div class="bg-[#00FFB2]/15 border border-[#00FFB2]/25 text-white text-sm rounded-2xl rounded-tr-sm px-4 py-3">`;
    }

    if (type === "text") {
        if (content.reasoning) {
            innerHTML += `
                <div class="mb-2 p-3 bg-white/5 border-l-2 border-[#00FFB2]/30 rounded-r-lg">
                    <div class="text-[10px] uppercase tracking-widest text-[#00FFB2]/60 mb-1 font-bold">Thought Process</div>
                    <div class="text-xs text-white/50 italic leading-relaxed">${content.reasoning}</div>
                </div>
            `;
        }
        innerHTML += `<div>${content.text || content}</div>`;
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
    if (!NVIDIA_CHAT_KEY) {
        appendMessage("bot", "⚠️ Nvidia Chat API Key is missing. Please add it in Settings (⚙️).");
        return;
    }

    messages.push({ role: "user", content: text });
    showTyping();

    try {
        // Using a CORS proxy for development. WARNING: This exposes your API key to the proxy.
        // For production, use a backend server.
        const proxyUrl = "https://corsproxy.io/?";
        const apiUrl = "https://integrate.api.nvidia.com/v1/chat/completions";
        
        const response = await fetch(proxyUrl + encodeURIComponent(apiUrl), {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${NVIDIA_CHAT_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: CHAT_MODEL,
                messages: messages,
                temperature: 1,
                top_p: 0.95,
                max_tokens: 4096,
                extra_body: {
                    chat_template_kwargs: { enable_thinking: false }
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const choice = data.choices[0];
        const replyText = choice.message.content;
        const reasoningText = choice.message.reasoning_content || null;

        messages.push({ role: "assistant", content: replyText });
        hideTyping();
        
        appendMessage("bot", { text: replyText, reasoning: reasoningText });
    } catch (error) {
        console.error("Chat Error:", error);
        hideTyping();
        appendMessage("bot", `⚠️ Error: ${error.message}`);
    }
}

async function generateImage(prompt) {
    if (!NVIDIA_IMAGE_KEY) {
        appendMessage("bot", "⚠️ Nvidia Image API Key is missing. Please add it in Settings (⚙️).");
        return;
    }

    showTyping();

    try {
        // Using a CORS proxy for development. WARNING: This exposes your API key to the proxy.
        const proxyUrl = "https://corsproxy.io/?";
        const apiUrl = "https://ai.api.nvidia.com/v1/genai/stabilityai/stable-diffusion-3-medium";

        const response = await fetch(proxyUrl + encodeURIComponent(apiUrl), {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${NVIDIA_IMAGE_KEY}`,
                "Content-Type": "application/json",
                "Accept": "application/json"
            },
            body: JSON.stringify({
                prompt: prompt,
                mode: "text-to-image",
                aspect_ratio: "1:1"
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        // Stability SD3 NIM returns base64 inside an artifacts array
        if (!data.artifacts || !data.artifacts[0] || !data.artifacts[0].base64) {
             // Fallback for some NIM versions that might use 'image' or different structure
             if (data.image) {
                 const url = `data:image/png;base64,${data.image}`;
                 hideTyping();
                 appendMessage("bot", url, "image");
                 return;
             }
            throw new Error("Invalid response format from SD3 API");
        }
        const b64Data = data.artifacts[0].base64;
        const url = `data:image/png;base64,${b64Data}`;
        
        hideTyping();
        appendMessage("bot", url, "image");
    } catch (error) {
        console.error("Image Error:", error);
        hideTyping();
        appendMessage("bot", `⚠️ Image generation failed: ${error.message}`);
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

// Event Listeners
sendBtn.onclick = sendMessage;

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

chatModeBtn.onclick = () => switchMode("chat");
imageModeBtn.onclick = () => switchMode("image");

// Settings Logic
settingsBtn.onclick = () => {
    nvidiaChatKeyInput.value = NVIDIA_CHAT_KEY;
    nvidiaImageKeyInput.value = NVIDIA_IMAGE_KEY;
    settingsModal.classList.add('active');
};

closeSettingsBtn.onclick = () => {
    settingsModal.classList.remove('active');
};

saveSettingsBtn.onclick = () => {
    NVIDIA_CHAT_KEY = nvidiaChatKeyInput.value.trim();
    NVIDIA_IMAGE_KEY = nvidiaImageKeyInput.value.trim();
    
    localStorage.setItem('nvidia_chat_key', NVIDIA_CHAT_KEY);
    localStorage.setItem('nvidia_image_key', NVIDIA_IMAGE_KEY);
    
    settingsModal.classList.remove('active');
    appendMessage("bot", "✅ Settings saved successfully!");
};

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
