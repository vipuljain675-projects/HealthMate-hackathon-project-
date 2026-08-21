'use client';

import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageSquareHeart, Send, Bot, User, Loader2, Sparkles, FileText, ExternalLink } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: any;
}

// Strip any residual <think>...</think> blocks or scratchpad text
function cleanAIResponse(text: string): string {
  if (!text) return '';
  // Remove <think> blocks (including unclosed ones)
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  // If there's still an unclosed <think> tag, drop everything from it onwards
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '');
  // Remove leftover stray tags
  cleaned = cleaned.replace(/<\/?think>/gi, '');
  return cleaned.trim();
}

// Render plain text + embedded URLs as clickable buttons
function MessageContent({ text }: { text: string }) {
  const cleaned = cleanAIResponse(text);
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = cleaned.split(urlRegex);

  return (
    <div className="prose prose-invert prose-sm max-w-none leading-relaxed">
      <ReactMarkdown
        components={{
          p: ({ children }) => {
            // Check if children contain a URL string
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'assistant',
      text: 'Hello Rajesh! 👋 I am your **AI Personal Health Assistant**.\n\nYou can ask me about:\n- 💊 Your medications and dosages\n- 🏥 Your past doctor visits\n- 🧪 Lab test results\n- 📄 Retrieve your uploaded prescription scans\n- 📅 Upcoming appointments\n\nHow can I help you today?'
    }
  ]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [loading, setLoading] = useState(false);

  const sampleQuestions = [
    "Hey buddy, give me back my uploaded prescription document scan!",
    "What did Dr. Ramesh Verma prescribe for my cholesterol?",
    "What lab tests were ordered at Metro Heart & Kidney Institute?",
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

    setMessages((prev) => [...prev, userMsg]);
    if (!questionText) setInputQuestion('');
    setLoading(true);

    try {
      const res = await fetch('http://localhost:8000/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer mock_token_dev'
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
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `Sorry, I encountered an issue connecting to the AI backend. *${err.message}*`
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full flex flex-col h-[calc(100vh-130px)]">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4 mb-4 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center space-x-2 text-teal-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <MessageSquareHeart className="w-4 h-4" />
            <span>Hybrid RAG Engine (SQL + ChromaDB)</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            AI Health <span className="gradient-text">Assistant</span>
          </h1>
        </div>
        <div className="px-3.5 py-1.5 rounded-full bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-teal-400" />
          <span>Grounded on Your Uploaded Records</span>
        </div>
      </div>

      {/* Chat Messages Body */}
      <div className="flex-1 glass-card rounded-3xl p-6 lg:p-8 border border-gray-800/80 overflow-y-auto space-y-5 shadow-2xl">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg ${
              msg.sender === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-teal-500/20'
            }`}>
              {msg.sender === 'user' ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            {/* Message Bubble */}
            <div className={`max-w-4xl rounded-2xl px-5 py-4 text-sm lg:text-base ${
              msg.sender === 'user'
                ? 'bg-blue-600/20 border border-blue-500/30 text-blue-100 rounded-tr-none'
                : 'bg-gray-900/90 border border-gray-800 text-gray-200 rounded-tl-none shadow-xl'
            }`}>
              <MessageContent text={msg.text} />

              {/* Retrieved Sources */}
              {msg.sources?.retrieved_notes?.length > 0 && (
                <div className="mt-4 pt-3.5 border-t border-gray-800/80 space-y-2">
                  <span className="text-xs uppercase tracking-wider text-teal-400 font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5" />
                    Retrieved Clinical Note Sources ({msg.sources.retrieved_notes.length}):
                  </span>
                  <div className="space-y-2">
                    {msg.sources.retrieved_notes.map((sn: any, sIdx: number) => (
                      <div key={sIdx} className="bg-gray-950 p-3 rounded-xl border border-gray-800 text-xs">
                        <span className="text-teal-300 font-bold block mb-1">
                          [{sn.date || 'Visit Note'}] Dr. {sn.doctor_name} ({sn.hospital}):
                        </span>
                        <p className="italic text-gray-400 font-mono text-[11px]">"{sn.note}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/20 text-teal-400 flex items-center justify-center animate-pulse">
              <Bot className="w-5 h-5" />
            </div>
            <div className="glass-card px-5 py-3.5 rounded-2xl border border-teal-500/30 text-xs text-teal-300 flex items-center gap-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              <span>Querying your records via SQL & ChromaDB...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Questions */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <span className="text-xs text-gray-500 font-semibold">Try asking:</span>
        {sampleQuestions.map((sq, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(sq)}
            className="text-xs bg-gray-900/90 hover:bg-gray-800 text-gray-300 hover:text-teal-300 px-3.5 py-2 rounded-xl border border-gray-800 hover:border-teal-500/40 transition-colors"
          >
            "{sq}"
          </button>
        ))}
      </div>

      {/* Input Form */}
      <form onSubmit={(e) => { e.preventDefault(); handleAsk(); }} className="flex items-center gap-3 mt-3">
        <input
          type="text"
          placeholder="Ask anything or request your uploaded document scan..."
          value={inputQuestion}
          onChange={(e) => setInputQuestion(e.target.value)}
          className="flex-1 bg-gray-900/90 border border-gray-800 rounded-2xl px-5 py-4 text-sm text-white focus:border-teal-500 focus:outline-none shadow-inner"
        />
        <button
          type="submit"
          disabled={!inputQuestion.trim() || loading}
          className="px-6 py-4 rounded-2xl font-bold text-white gradient-btn flex items-center justify-center gap-2 disabled:opacity-50 shadow-lg shadow-teal-500/20"
        >
          <Send className="w-4 h-4" />
          <span className="hidden sm:inline">Ask</span>
        </button>
      </form>
    </div>
  );
}
