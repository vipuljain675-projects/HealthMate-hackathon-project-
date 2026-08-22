'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { 
  MessageSquareHeart, 
  Send, 
  Sparkles, 
  Bot, 
  User, 
  Loader2, 
  ExternalLink, 
  FileText,
  ShieldCheck
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: any;
}

function cleanAIResponse(text: string): string {
  if (!text) return '';
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '');
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  return cleaned.trim();
}

function MessageContent({ text }: { text: string }) {
  const cleaned = cleanAIResponse(text);
  const urlRegex = /(https?:\/\/[^\s]+)/g;

  return (
    <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => {
            const childArr = React.Children.toArray(children);
            return (
              <p className="mb-2 last:mb-0">
                {childArr.map((child, i) => {
                  if (typeof child === 'string') {
                    const urlParts = child.split(urlRegex);
                    return urlParts.map((part, j) =>
                      part.match(urlRegex) ? (
                        <a
                          key={`${i}-${j}`}
                          href={part}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-teal-300 hover:text-white font-bold bg-gradient-to-r from-teal-600/80 to-blue-600/80 px-3 py-1.5 rounded-lg shadow-md hover:scale-105 transition-all my-1 no-underline"
                        >
                          <FileText className="w-4 h-4 flex-shrink-0" />
                          <span>📄 Open Original Document Scan</span>
                          <ExternalLink className="w-3.5 h-3.5 flex-shrink-0" />
                        </a>
                      ) : (
                        <span key={`${i}-${j}`}>{part}</span>
                      )
                    );
                  }
                  return child;
                })}
              </p>
            );
          },
          strong: ({ children }) => <strong className="text-white font-bold">{children}</strong>,
          em: ({ children }) => <em className="text-gray-300 italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2 text-gray-200">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2 text-gray-200">{children}</ol>,
          li: ({ children }) => <li className="text-gray-200">{children}</li>,
          h1: ({ children }) => <h1 className="text-lg font-bold text-white mt-3 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold text-teal-300 mt-3 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold text-teal-400 mt-2 mb-1">{children}</h3>,
          blockquote: ({ children }) => <blockquote className="border-l-2 border-teal-500 pl-3 text-gray-400 italic my-2">{children}</blockquote>,
          code: ({ children }) => <code className="bg-gray-800 text-teal-300 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
        }}
      >
        {cleaned}
      </ReactMarkdown>
    </div>
  );
}

export default function AskPage() {
  const [userName, setUserName] = useState('Patient');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let name = 'Patient';
    try {
      const raw = localStorage.getItem('user_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.name) name = parsed.name.split(' ')[0];
      }
    } catch (e) {}

    setUserName(name);
    setMessages([
      {
        id: 'welcome-1',
        sender: 'assistant',
        text: `Hello ${name}! 👋 I am your **AI Personal Health Assistant**.\n\nYou can ask me about:\n- 💊 Your medications and dosages\n- 🏥 Your past doctor visits\n- 🧪 Lab test results\n- 📄 Retrieve your uploaded prescription scans\n- 📅 Upcoming appointments\n\nHow can I help you today?`
      }
    ]);
  }, []);

  const sampleQuestions = [
    "Hey buddy, give me back my uploaded prescription document scan!",
    "What medicines did the doctor prescribe for me?",
    "What lab tests or diagnoses are in my records?",
    "When is my next upcoming doctor appointment?"
  ];

  const handleAsk = async (questionText?: string) => {
    const query = questionText || inputQuestion;
    if (!query.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: query.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!questionText) setInputQuestion('');
    setLoading(true);

    try {
      let token = 'mock_token_dev';
      try {
        const raw = localStorage.getItem('user_session');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed.auth_token) token = parsed.auth_token;
        }
      } catch (e) {}

      const res = await fetch('http://localhost:8000/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ question: query.trim() })
      });

      if (!res.ok) throw new Error(`Server returned ${res.status}`);

      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: cleanAIResponse(data.answer),
        sources: data.sources
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `I encountered an issue processing your query against your records. Error: ${err.message || 'Server error'}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <MessageSquareHeart className="w-4 h-4" />
            <span>Natural Language Medical Q&A</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            AI Health <span className="gradient-text">Assistant</span>
          </h1>
        </div>

        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Grounded on Your Uploaded Records</span>
        </div>
      </div>

      {/* Chat Messages Box */}
      <div className="glass-card rounded-3xl p-6 border border-gray-800 min-h-[480px] max-h-[560px] overflow-y-auto space-y-4 flex flex-col justify-between">
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${
                msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                }`}
              >
                {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-2xl rounded-2xl p-4 shadow-lg ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none'
                    : 'bg-gray-900/90 border border-gray-800 text-gray-200 rounded-tl-none'
                }`}
              >
                <MessageContent text={msg.text} />
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/30 text-teal-400 flex items-center justify-center animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-2xl rounded-tl-none p-3.5 text-xs text-gray-400 flex items-center space-x-2">
                <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                <span>Searching your medical records & synthesizing response...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="space-y-2">
        <p className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Try asking:</p>
        <div className="flex flex-wrap gap-2">
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAsk(q)}
              disabled={loading}
              className="text-xs bg-gray-900 hover:bg-gray-800 text-gray-300 hover:text-teal-300 border border-gray-800 hover:border-teal-500/40 px-3.5 py-1.5 rounded-xl transition-all font-medium text-left"
            >
              "{q}"
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk();
        }}
        className="flex items-center space-x-2"
      >
        <input
          type="text"
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          placeholder="Ask anything or request your uploaded document scan..."
          disabled={loading}
          className="flex-1 bg-gray-900 border border-gray-800 rounded-2xl px-5 py-3 text-sm text-white focus:border-teal-500 focus:outline-none shadow-xl"
        />
        <button
          type="submit"
          disabled={loading || !inputQuestion.trim()}
          className="gradient-btn text-white px-6 py-3 rounded-2xl font-bold text-sm flex items-center space-x-2 shadow-lg shadow-teal-500/20 disabled:opacity-50"
        >
          <span>Ask</span>
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
