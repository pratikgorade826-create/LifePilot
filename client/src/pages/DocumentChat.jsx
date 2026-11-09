import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  FileText,
  ArrowLeft,
  Send,
  Sparkles,
  Bot,
  User,
  Loader2,
  BookOpen,
  Info
} from 'lucide-react';
import { documentsAPI } from '../services/api';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DocumentChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const sampleQuestions = [
    'Explain this document in simple terms.',
    'What are the core technical requirements?',
    'What are the important dates and deadlines?',
    'What action items should I execute first?'
  ];

  useEffect(() => {
    loadDoc();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const loadDoc = async () => {
    try {
      setLoading(true);
      const res = await documentsAPI.getOne(id);
      setDocument(res.data.document);

      // Seed initial welcome message
      setMessages([
        {
          _id: '1',
          sender: 'assistant',
          content: `Hello! I have indexed **"${res.data.document.originalName}"** into **${res.data.document.totalChunks || 1} searchable chunks**. Ask me anything about this document, its specifications, or deadlines.`
        }
      ]);
    } catch (err) {
      console.error('Failed to load document for chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAsk = async (customQ = null) => {
    const qToSend = customQ || input;
    if (!qToSend.trim() || chatLoading) return;

    setInput('');
    const userMsg = {
      _id: Date.now().toString(),
      sender: 'user',
      content: qToSend
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await documentsAPI.ask(id, qToSend);
      const assistantMsg = {
        _id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: res.data.answer,
        sources: res.data.sources || [],
        isDemoOutput: res.data.isDemoOutput
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          _id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: 'Sorry, I encountered an issue querying the document chunks.'
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Preparing document conversational agent..." />;
  }

  if (!document) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Document not found.</p>
        <Link to="/documents" className="text-emerald-400 underline text-sm mt-2 block">Back to Knowledge Hub</Link>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-7rem)] flex flex-col bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-[#111827]/90 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/documents/${id}`)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="truncate">
            <h2 className="text-sm font-bold text-white truncate flex items-center gap-2">
              <FileText size={16} className="text-emerald-400 shrink-0" />
              <span>{document.originalName}</span>
            </h2>
            <span className="text-[11px] text-slate-400">Contextual Q&A with Source Chunk Citations</span>
          </div>
        </div>

        <Link
          to={`/documents/${id}`}
          className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
        >
          View Full Insights
        </Link>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-thin">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          return (
            <div
              key={m._id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                  isUser
                    ? 'bg-indigo-600 text-white'
                    : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                }`}
              >
                {isUser ? <User size={16} /> : <Bot size={16} />}
              </div>

              <div className={`space-y-2 max-w-2xl ${isUser ? 'items-end' : ''}`}>
                <div
                  className={`p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-[#0B0F19] border border-slate-800/80 text-slate-200 rounded-tl-none shadow-md'
                  }`}
                >
                  <div className="prose prose-invert prose-xs max-w-none">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>

                  {/* Sources citation section */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-1.5">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                        <BookOpen size={11} /> Cited Excerpts ({m.sources.length})
                      </span>
                      {m.sources.map((s, idx) => (
                        <div key={idx} className="p-2 rounded-lg bg-[#111827] text-[10px] text-slate-400 border border-slate-800/60">
                          <span className="font-semibold text-slate-300 block mb-0.5">
                            Chunk #{s.chunkIndex + 1} {s.pageNumber ? `(Page ${s.pageNumber})` : ''}
                          </span>
                          <span className="italic">"{s.excerpt}"</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {chatLoading && (
          <div className="flex gap-3 max-w-3xl mr-auto animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
              <Bot size={16} />
            </div>
            <div className="p-4 rounded-2xl bg-[#0B0F19] border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-emerald-400" />
              <span>Scanning document chunks & synthesizing citations...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Bar */}
      <div className="px-6 py-2 bg-[#0B0F19]/40 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto scrollbar-none">
        <span className="text-[10px] text-slate-500 uppercase font-bold shrink-0">Suggestions:</span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleAsk(q)}
            className="px-2.5 py-1 rounded-lg text-[11px] bg-[#111827] text-slate-300 hover:text-white border border-slate-800 hover:border-emerald-500/40 whitespace-nowrap transition"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-800 bg-[#0B0F19]/80">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask questions about "${document.originalName}"...`}
            className="flex-1 bg-[#111827] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
          />
          <button
            type="submit"
            disabled={chatLoading || !input.trim()}
            className="p-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl shadow-md shadow-emerald-500/20 disabled:opacity-40 transition flex items-center justify-center"
          >
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};
