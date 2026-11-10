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
  Info,
  CheckCircle2,
  ExternalLink,
  Download,
  Layers,
  ChevronDown,
  X
} from 'lucide-react';
import { documentsAPI } from '../services/api';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DocumentChat = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [document, setDocument] = useState(null);
  const [allDocuments, setAllDocuments] = useState([]);
  const [selectedMultiDocIds, setSelectedMultiDocIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [activeCitationSource, setActiveCitationSource] = useState(null);

  const messagesEndRef = useRef(null);

  const sampleQuestions = [
    'Explain the core objective of this document in simple terms.',
    'What are the critical milestone dates and deadlines?',
    'What are the primary technical and architecture requirements?',
    'What action items should the team execute first?'
  ];

  useEffect(() => {
    loadInitialData();
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [docRes, allDocsRes] = await Promise.all([
        documentsAPI.getOne(id),
        documentsAPI.getAll()
      ]);

      const currentDoc = docRes.data.document;
      setDocument(currentDoc);
      setAllDocuments(allDocsRes.data.documents || []);
      setSelectedMultiDocIds([currentDoc._id]);

      // Seed initial welcome message
      setMessages([
        {
          _id: '1',
          sender: 'assistant',
          content: `Hello! I have indexed **"${currentDoc.originalName}"** with **${currentDoc.totalChunks || 1} searchable RAG chunks**. Ask me anything about specifications, deadlines, methodologies, or study notes.`
        }
      ]);
    } catch (err) {
      console.error('Failed to load document for chat:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (queryText = null) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || chatLoading) return;

    const userMessage = {
      _id: Date.now().toString(),
      sender: 'user',
      content: textToSend.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    if (!queryText) setInput('');
    setChatLoading(true);

    try {
      let res;
      if (selectedMultiDocIds.length > 1) {
        // Multi-document query
        res = await documentsAPI.multiAsk(selectedMultiDocIds, textToSend.trim());
      } else {
        // Single document query
        res = await documentsAPI.ask(id, textToSend.trim(), messages);
      }

      const assistantMessage = {
        _id: (Date.now() + 1).toString(),
        sender: 'assistant',
        content: res.data.answer,
        sources: res.data.sources || [],
        isDemoOutput: res.data.isDemoOutput,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          _id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: `Apologies, I encountered an issue processing your query: ${err.response?.data?.message || err.message}`,
          isError: true
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleExportChat = () => {
    const markdown = messages.map(m => `### ${m.sender === 'user' ? 'User' : 'LifePilot AI'}\n${m.content}\n`).join('\n---\n\n');
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `${document?.originalName || 'document'}_chat_notes.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleDocInMulti = (docId) => {
    setSelectedMultiDocIds(prev =>
      prev.includes(docId)
        ? (prev.length > 1 ? prev.filter(x => x !== docId) : prev)
        : [...prev, docId]
    );
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" text="Loading AI Document Assistant..." />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8.5rem)] max-w-6xl mx-auto space-y-4">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/documents/${id}`)}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
            title="Back to Document Details"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h1 className="text-base font-bold text-slate-100 truncate max-w-md">
                Document AI Chat: {document?.originalName}
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Evidence-based answers citing verified excerpts and page numbers.
            </p>
          </div>
        </div>

        {/* Multi-Document Scope Selector & Export */}
        <div className="flex items-center gap-2.5">
          <details className="relative">
            <summary className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 cursor-pointer list-none flex items-center gap-1.5 border border-slate-700">
              <Layers size={14} className="text-[#ffa952]" />
              Scope: {selectedMultiDocIds.length} Document{selectedMultiDocIds.length > 1 ? 's' : ''}
              <ChevronDown size={13} />
            </summary>
            <div className="absolute right-0 mt-2 w-72 p-3 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl z-30 space-y-2 text-xs">
              <span className="font-bold text-slate-300 block mb-1">Select Documents in Scope:</span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {allDocuments.map(d => (
                  <label key={d._id} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedMultiDocIds.includes(d._id)}
                      onChange={() => toggleDocInMulti(d._id)}
                      className="accent-[#ffa952]"
                    />
                    <span className="truncate text-slate-300 font-medium">{d.originalName}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>

          <button
            onClick={handleExportChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            title="Export to Markdown Notes"
          >
            <Download size={14} />
            Export Notes
          </button>
        </div>
      </div>

      {/* Main Chat Scroll Container */}
      <div className="flex-1 overflow-y-auto p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-4 scrollbar-thin">
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          return (
            <div
              key={msg._id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                  isUser
                    ? 'bg-[#ffa952] text-[#1f2328]'
                    : 'bg-gradient-to-tr from-[#ffa952] to-[#ef5a5a] text-white'
                }`}
              >
                {isUser ? <User size={15} /> : <Sparkles size={15} />}
              </div>

              {/* Message Bubble */}
              <div className="space-y-2 max-w-[85%]">
                <div
                  className={`p-4 rounded-2xl text-xs leading-relaxed ${
                    isUser
                      ? 'bg-[#ffa952] text-[#1f2328] font-medium rounded-tr-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-100 rounded-tl-sm shadow-md'
                  }`}
                >
                  <ReactMarkdown className="prose prose-invert prose-xs max-w-none">
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Source Citations Pills */}
                {!isUser && msg.sources && msg.sources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1 flex items-center gap-1">
                      <BookOpen size={10} /> Sources:
                    </span>
                    {msg.sources.map((src, sIdx) => (
                      <button
                        key={sIdx}
                        onClick={() => setActiveCitationSource(src)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 hover:bg-[#ffa952] hover:text-[#1f2328] text-slate-300 border border-slate-700 transition"
                      >
                        {src.documentName ? `${src.documentName.slice(0, 15)}... ` : ''}
                        Chunk {src.chunkIndex + 1} {src.pageNumber ? `(Page ${src.pageNumber})` : ''}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {chatLoading && (
          <div className="flex gap-3 max-w-md items-center text-xs text-slate-400 animate-pulse">
            <div className="w-8 h-8 rounded-xl bg-slate-800 flex items-center justify-center text-[#ffa952]">
              <Sparkles size={16} />
            </div>
            <span>Searching indexed chunks and generating evidence-based response...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Prompt Chips */}
      {messages.length <= 2 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Try Asking:</span>
          {sampleQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(q)}
              className="px-3 py-1.5 rounded-xl text-xs bg-slate-900 border border-slate-800 hover:border-[#ffa952] text-slate-300 hover:text-slate-100 transition whitespace-nowrap"
            >
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input Form Bar */}
      <div className="relative flex items-center gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSendMessage();
          }}
          placeholder={`Ask anything about ${selectedMultiDocIds.length > 1 ? `${selectedMultiDocIds.length} documents` : `"${document?.originalName}"`}...`}
          className="flex-1 p-3.5 pl-4 pr-12 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-[#ffa952] placeholder-slate-500 shadow-inner"
        />

        <button
          onClick={() => handleSendMessage()}
          disabled={!input.trim() || chatLoading}
          className="absolute right-2 p-2.5 rounded-lg bg-[#ffa952] text-[#1f2328] hover:bg-[#ef5a5a] hover:text-white transition disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
        >
          {chatLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </div>

      {/* Citation Inspector Modal / Drawer */}
      {activeCitationSource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BookOpen size={16} className="text-[#ffa952]" />
                <h4 className="text-sm font-bold text-slate-100">
                  Verified Source Citation: Chunk {activeCitationSource.chunkIndex + 1}
                </h4>
              </div>
              <button onClick={() => setActiveCitationSource(null)} className="text-slate-400 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>Document: <b>{activeCitationSource.documentName || document?.originalName}</b></span>
                {activeCitationSource.pageNumber && (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold">
                    Page {activeCitationSource.pageNumber}
                  </span>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-[11px] text-slate-300 leading-relaxed border border-slate-800">
                "{activeCitationSource.excerpt}"
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveCitationSource(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-[#ffa952] text-[#1f2328] hover:bg-[#ef5a5a] hover:text-white"
              >
                Close Citation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
