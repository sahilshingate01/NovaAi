'use client';

import { useState, useRef, useEffect } from 'react';
import styles from './page.module.css';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'image';
  imageData?: string;
}

export default function Home() {
  const [mode, setMode] = useState<'chat' | 'image'>('chat');
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [imageMessages, setImageMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = mode === 'chat' ? chatMessages : imageMessages;
  const setMessages = mode === 'chat' ? setChatMessages : setImageMessages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatMessages, imageMessages, mode]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    if (mode === 'chat') {
      const newMessages: Message[] = [...chatMessages, { role: 'user', content: userMessage }];
      setChatMessages(newMessages);

      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: newMessages.map(m => ({ role: m.role, content: m.content })) }),
        });

        const data = await response.json();
        
        if (data.error) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error.message || data.error}` }]);
        } else if (data.choices?.[0]?.message) {
          setChatMessages(prev => [...prev, { role: 'assistant', content: data.choices[0].message.content }]);
        }
      } catch (error) {
        console.error('Chat error:', error);
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Could not connect to the chat service.' }]);
      }
    } else {
      // Image mode
      const newMessages: Message[] = [...imageMessages, { role: 'user', content: `Generating: ${userMessage}` }];
      setImageMessages(newMessages);
      
      try {
        const response = await fetch('/api/image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: userMessage }),
        });

        const data = await response.json();
        const imageBase64 = data.artifacts?.[0]?.base64 || data.image || data.url;
        
        if (imageBase64) {
          setImageMessages(prev => [...prev, { 
            role: 'assistant', 
            content: 'Success! Image generated.', 
            type: 'image', 
            imageData: imageBase64.startsWith('http') ? imageBase64 : `data:image/png;base64,${imageBase64}`
          }]);
        } else {
          setImageMessages(prev => [...prev, { role: 'assistant', content: data.error || 'Failed to generate image.' }]);
        }
      } catch (error) {
        console.error('Image error:', error);
        setImageMessages(prev => [...prev, { role: 'assistant', content: 'Connection error during image generation.' }]);
      }
    }

    setIsLoading(false);
  };

  return (
    <div className={styles.container}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <h1>Nova AI</h1>
        </div>
        <nav className={styles.nav}>
          <button 
            className={`${styles.navItem} ${mode === 'chat' ? styles.active : ''}`}
            onClick={() => setMode('chat')}
          >
            <span>💬</span> Chat
          </button>
          <button 
            className={`${styles.navItem} ${mode === 'image' ? styles.active : ''}`}
            onClick={() => setMode('image')}
          >
            <span>🎨</span> Image Create
          </button>
        </nav>
      </aside>

      <main className={styles.main}>
        <header className={styles.header}>
          <h2>{mode === 'chat' ? 'Conversational AI' : 'Image Generation'}</h2>
          <div className={styles.badge}>{mode.toUpperCase()} MODE</div>
        </header>

        <div className={styles.chatArea}>
          {messages.length === 0 && (
            <div className={styles.emptyState}>
              <div className={styles.heroIcon}>{mode === 'chat' ? '✨' : '🌈'}</div>
              <h3>Welcome to Nova AI</h3>
              <p>
                {mode === 'chat' 
                  ? 'Start a conversation or ask me anything. I am here to help.' 
                  : 'Describe the image you want to create and let the AI bring it to life.'}
              </p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`${styles.message} ${styles[msg.role]} fade-in`}>
              <div className={styles.avatar}>{msg.role === 'user' ? 'U' : 'AI'}</div>
              <div className={styles.content}>
                <p>{msg.content}</p>
                {msg.type === 'image' && msg.imageData && (
                  <div className={styles.imageContainer}>
                    <img src={msg.imageData} alt="Generated" className={styles.generatedImage} />
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.message} ${styles.assistant} fade-in`}>
              <div className={styles.avatar}>AI</div>
              <div className={styles.content}>
                <div className={styles.typing}>
                  <span></span><span></span><span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <footer className={styles.footer}>
          <div className={styles.inputWrapper}>
            <input
              type="text"
              placeholder={mode === 'chat' ? "Type a message..." : "Describe an image..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              className={styles.input}
            />
            <button 
              onClick={handleSend} 
              className={styles.sendButton}
              disabled={isLoading || !input.trim()}
            >
              {isLoading ? '...' : (mode === 'chat' ? 'Send' : 'Generate')}
            </button>
          </div>
        </footer>
      </main>
    </div>
  );
}
