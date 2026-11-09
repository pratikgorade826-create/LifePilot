import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Send,
  Sparkles,
  Bot,
  User,
  Plus,
  Trash2,
  Copy,
  Check,
  Plane,
  FolderKanban,
  FileText,
  CheckSquare,
  AlertCircle,
  Loader2,
  Calendar,
  Layers
} from 'lucide-react';
import { aiAPI } from '../services/api';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';

export const Assistant = () => {
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const messagesEndRef = useRef(null);

  const suggestedPrompts = [
    { label: '🏖️ 5-day Goa Trip', prompt: 'Plan a 5-day Goa trip for four people under ₹15,000 per person.' },
    { label: '🚀 10-day Web Project', prompt: 'Help me build a college website in 10 days.' },
    { label: '📄 Document Intelligence', prompt: 'Summarize my uploaded document and extract actionable tasks.' },
    { label: '✅ Database Design Task', prompt: 'Create a task to complete my database design by tomorrow.' }
  ];

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (currentConversationId) {
      loadMessages(currentConversationId);
    }
  }, [currentConversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = async () => {
    try {
      const res = await aiAPI.getConversations();
      setConversations(res.data.conversations || []);
      if (res.data.conversations?.length > 0 && !currentConversationId) {
        setCurrentConversationId(res.data.conversations[0]._id);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadMessages = async (convId) => {
    try {
      const res = await aiAPI.getMessages(convId);
      setMessages(res.data.messages || []);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if (!textToSend.trim() || isLoading) return;

    setInputMessage('');
    const tempUserMsg = {
      _id: Date.now().toString(),
      sender: 'user',
      content: textToSend,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setIsLoading(true);

    try {
      const res = await aiAPI.chat({
        message: textToSend,
        conversationId: currentConversationId
      });

      if (!currentConversationId && res.data.conversationId) {
        setCurrentConversationId(res.data.conversationId);
        loadConversations();
      }

      setMessages((prev) => [...prev, res.data.message]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          _id: (Date.now() + 1).toString(),
          sender: 'assistant',
          content: 'Sorry, I encountered an error communicating with the orchestration server. Please try again.',
          isError: true
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    try {
      await aiAPI.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (currentConversationId === convId) {
        handleNewConversation();
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleApproveAction = async (msg) => {
    if (!msg.actionSuggested || !msg.structuredData) return;

    setApprovalLoading(true);
    try {
      const res = await aiAPI.approveAction({
        messageId: msg._id,
        actionType: msg.actionSuggested,
        customData: msg.structuredData
      });

      setApprovalMessage(res.data.message || 'Action executed successfully!');
      // Update local message status
      setMessages((prev) =>
        prev.map((m) => (m._id === msg._id ? { ...m, actionStatus: 'saved' } : m))
      );
      setTimeout(() => setApprovalMessage(''), 4000);
    } catch (err) {
      console.error('Action approval failed:', err);
    } finally {
      setApprovalLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-7rem)] flex gap-6">
      {/* Sidebar: Conversation history */}
      <div className="hidden md:flex flex-col w-72 bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Conversations</span>
          <button
            onClick={handleNewConversation}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition"
          >
            <Plus size={14} /> New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin">
          {conversations.length > 0 ? (
            conversations.map((c) => (
              <div
                key={c._id}
                onClick={() => setCurrentConversationId(c._id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium cursor-pointer transition group ${
                  currentConversationId === c._id
                    ? 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="truncate pr-2">
                  <p className="truncate">{c.title || 'Conversation'}</p>
                  <span className="text-[10px] text-slate-500">{new Date(c.lastMessageAt).toLocaleDateString()}</span>
                </div>
                <button
                  onClick={(e) => handleDeleteConversation(e, c._id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 rounded transition"
                  title="Delete chat"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))
          ) : (
            <div className="p-6 text-center text-xs text-slate-500">
              No conversations yet. Start chatting below!
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col bg-[#111827] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Chat Header */}
        <div className="h-14 px-6 border-b border-slate-800 flex items-center justify-between bg-[#111827]/80 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
              <Bot size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-200">Unified Orchestrator</h2>
              <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Ready (Travel, Project, Docs, Tasks)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNewConversation}
              className="md:hidden flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg bg-indigo-600 text-white"
            >
              <Plus size={14} /> New
            </button>
          </div>
        </div>

        {/* Global Action Message Banner */}
        {approvalMessage && (
          <div className="px-6 py-2.5 bg-emerald-500/15 border-b border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <Check size={14} />
            <span>{approvalMessage}</span>
          </div>
        )}

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white mb-6 shadow-xl shadow-indigo-500/25">
                <Sparkles size={32} />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">How can LifePilot assist you today?</h3>
              <p className="text-xs text-slate-400 mb-8 leading-relaxed">
                Describe a trip you'd like to take, a project you want to organize, an uploaded document you need explained, or a todo item you must remember.
              </p>

              {/* Quick Prompt Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                {suggestedPrompts.map((item, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendMessage(item.prompt)}
                    className="p-3 text-left rounded-xl bg-[#0B0F19] hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 transition group"
                  >
                    <span className="text-xs font-semibold text-slate-200 block mb-1 group-hover:text-indigo-400">
                      {item.label}
                    </span>
                    <span className="text-[11px] text-slate-400 block line-clamp-2">
                      {item.prompt}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.sender === 'user';
              return (
                <div
                  key={m._id}
                  className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      isUser
                        ? 'bg-gradient-to-tr from-indigo-500 to-violet-600 text-white'
                        : 'bg-slate-800 text-indigo-400 border border-slate-700'
                    }`}
                  >
                    {isUser ? <User size={16} /> : <Bot size={16} />}
                  </div>

                  {/* Message Bubble */}
                  <div className={`space-y-2 max-w-2xl ${isUser ? 'items-end' : ''}`}>
                    <div
                      className={`p-4 rounded-2xl text-sm leading-relaxed ${
                        isUser
                          ? 'bg-indigo-600 text-white rounded-tr-none'
                          : 'bg-[#0B0F19] border border-slate-800/80 text-slate-200 rounded-tl-none shadow-md'
                      }`}
                    >
                      {/* Intent badge on Assistant message */}
                      {!isUser && m.intent && m.intent !== 'GENERAL' && (
                        <div className="mb-2.5 flex items-center gap-2">
                          <Badge
                            variant={
                              m.intent === 'TRAVEL'
                                ? 'primary'
                                : m.intent === 'PROJECT'
                                ? 'violet'
                                : m.intent === 'KNOWLEDGE'
                                ? 'cyan'
                                : 'warning'
                            }
                          >
                            {m.intent} INTENT DETECTED
                          </Badge>
                          {m.isDemoOutput && (
                            <span className="text-[10px] text-amber-400 font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                              Demo Output
                            </span>
                          )}
                        </div>
                      )}

                      <div className="prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>

                      {/* Structured Result Action Card */}
                      {!isUser && m.actionSuggested && m.structuredData && (
                        <div className="mt-4 p-4 rounded-xl bg-[#111827] border border-indigo-500/30 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                              {m.actionSuggested === 'SAVE_TRIP' && <Plane size={14} />}
                              {m.actionSuggested === 'CREATE_PROJECT' && <FolderKanban size={14} />}
                              {m.actionSuggested === 'CREATE_TASKS' && <CheckSquare size={14} />}
                              Proposed Action
                            </span>
                            {m.actionStatus === 'saved' ? (
                              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                                <Check size={14} /> Saved & Approved
                              </span>
                            ) : (
                              <button
                                onClick={() => handleApproveAction(m)}
                                disabled={approvalLoading}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white transition flex items-center gap-1.5 disabled:opacity-50"
                              >
                                {approvalLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                {m.actionSuggested === 'SAVE_TRIP' && 'Save to My Trips'}
                                {m.actionSuggested === 'CREATE_PROJECT' && 'Create Project & Tasks'}
                                {m.actionSuggested === 'CREATE_TASKS' && 'Approve & Add Task'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Copy and Timestamp */}
                    <div className="flex items-center gap-2 px-1 text-[11px] text-slate-500">
                      <span>{new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <button
                        onClick={() => handleCopy(m._id, m.content)}
                        className="hover:text-slate-300 transition"
                        title="Copy text"
                      >
                        {copiedId === m._id ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isLoading && (
            <div className="flex gap-3 max-w-3xl mr-auto animate-pulse">
              <div className="w-8 h-8 rounded-xl bg-slate-800 text-indigo-400 flex items-center justify-center shrink-0 border border-slate-700">
                <Bot size={16} />
              </div>
              <div className="p-4 rounded-2xl bg-[#0B0F19] border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                <Loader2 size={14} className="animate-spin text-indigo-400" />
                <span>Classifying intent & orchestrating specialized workflow...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800 bg-[#0B0F19]/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask anything (e.g. 'Plan a 5-day Goa trip under ₹15,000' or 'Break down my college project')..."
              className="flex-1 bg-[#111827] border border-slate-700/80 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
            />
            <button
              type="submit"
              disabled={isLoading || !inputMessage.trim()}
              className="p-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl shadow-md shadow-indigo-500/20 disabled:opacity-40 transition flex items-center justify-center"
            >
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

