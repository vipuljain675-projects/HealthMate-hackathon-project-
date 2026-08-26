'use client';

import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
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

import { BACKEND_URL } from '@/lib/config';

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
    <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-gray-200">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-gray-800 shadow-md">
              <table className="min-w-full divide-y divide-gray-800 text-left text-sm">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-gray-900/60">{children}</thead>,
          th: ({ children }) => <th className="px-4 py-3 font-bold text-teal-300 border-b border-gray-800">{children}</th>,
          td: ({ children }) => <td className="px-4 py-3 text-gray-200 border-b border-gray-800/40 align-top whitespace-normal break-words">{children}</td>,
          tr: ({ children }) => <tr className="hover:bg-white/[0.02] transition-colors">{children}</tr>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-teal-300 hover:text-white font-bold bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 px-3 py-1.5 rounded-lg shadow-md hover:scale-102 transition-all my-0.5 no-underline cursor-pointer text-xs"
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{children || 'Open Document Scan'}</span>
              <ExternalLink className="w-3 h-3 flex-shrink-0" />
            </a>
          ),

          p: ({ children }) => {
            const childArr = React.Children.toArray(children);
            return (
              <p className="mb-3 last:mb-0">
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
          ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-3 text-gray-200 pl-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-3 text-gray-200 pl-2">{children}</ol>,
          li: ({ children }) => <li className="text-gray-200 mb-1">{children}</li>,
          h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-4 mb-2 border-b border-gray-800 pb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-teal-300 mt-4 mb-2">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-bold text-teal-400 mt-3 mb-1">{children}</h3>,
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

      const res = await fetch(`${BACKEND_URL}/api/ask`, {
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
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto space-y-4">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 pb-4 flex-shrink-0">
        <div>
          <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <MessageSquareHeart className="w-4 h-4" />
            <span>Natural Language Medical Q&A</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            AI Health <span className="gradient-text">Assistant</span>
          </h1>
        </div>

        <div className="hidden sm:flex items-center space-x-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold">
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Grounded on Your Uploaded Records</span>
        </div>
      </div>

      {/* Chat Messages Container (Borderless, Spacious, Full-Width) */}
      <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-4 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-4 max-w-full ${
              msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            {/* Avatar */}
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
                msg.sender === 'user'
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 text-white'
                  : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            {/* Message Bubble */}
            <div
              className={`max-w-[85%] sm:max-w-[78%] rounded-2xl ${
                msg.sender === 'user'
                  ? 'bg-blue-600/90 text-white p-4 rounded-tr-none shadow-md'
                  : 'text-gray-100 py-1'
              }`}
            >
              <MessageContent text={msg.text} />
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start space-x-4">
            <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20 animate-pulse">
              <Bot className="w-5 h-5" />
            </div>
            <div className="text-gray-400 py-2 flex items-center space-x-2.5 text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              <span>Analyzing records & compiling response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer pinned bottom input bar + suggestions */}
      <div className="mt-auto space-y-4 pt-2 bg-[#070a11] flex-shrink-0">
        {/* Suggested Questions */}
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Try asking:</p>
          <div className="flex flex-wrap gap-2">
            {sampleQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(q)}
                disabled={loading}
                className="text-xs bg-gray-900/60 hover:bg-gray-800/80 text-gray-300 hover:text-teal-300 border border-gray-850 hover:border-teal-500/30 px-3 py-1.5 rounded-xl transition-all cursor-pointer font-medium"
              >
                "{q}"
              </button>
            ))}
          </div>
        </div>

        {/* Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center space-x-3 bg-gray-900/40 border border-gray-800 rounded-2xl p-1.5 focus-within:border-teal-500/60 transition-colors shadow-lg"
        >
          <input
            type="text"
            value={inputQuestion}
            onChange={(e) => setInputQuestion(e.target.value)}
            placeholder="Ask anything or request your uploaded document scan..."
            disabled={loading}
            className="flex-1 bg-transparent px-4 py-2.5 text-sm text-white focus:outline-none placeholder:text-gray-500 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !inputQuestion.trim()}
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center space-x-2 transition-all shadow-md shadow-teal-500/10 disabled:opacity-50 cursor-pointer"
          >
            <span>Ask</span>
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

