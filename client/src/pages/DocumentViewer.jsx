import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  Calendar,
  CheckCircle2,
  Tag,
  Layers,
  CheckSquare,
  Loader2,
  Trash2
} from 'lucide-react';
import { documentsAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const DocumentViewer = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [document, setDocument] = useState(null);
  const [chunks, setChunks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [convertingIdx, setConvertingIdx] = useState(null);
  const [convertFeedback, setConvertFeedback] = useState('');

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const res = await documentsAPI.getOne(id);
      setDocument(res.data.document);
      setChunks(res.data.sampleChunks || []);
    } catch (err) {
      console.error('Failed to load document:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleConvertAction = async (idx) => {
    try {
      setConvertingIdx(idx);
      const res = await documentsAPI.convertAction(id, idx);
      setConvertFeedback(`Converted to Task: "${res.data.task?.title}"!`);

      // Update local state
      const updatedActions = [...document.actionItems];
      updatedActions[idx].convertedToTask = true;
      setDocument({ ...document, actionItems: updatedActions });

      setTimeout(() => setConvertFeedback(''), 4000);
    } catch (err) {
      console.error('Conversion failed:', err);
    } finally {
      setConvertingIdx(null);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Analyzing document insights..." />;
  }

  if (!document) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Document not found.</p>
        <Link to="/documents" className="text-emerald-400 underline text-sm mt-2 block">Back to Hub</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white">{document.originalName}</h1>
              <Badge variant="cyan">{document.fileType.toUpperCase()}</Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Layers size={13} className="text-slate-500" />
              <span>{document.totalChunks || 1} Chunks ({document.totalCharacters} chars)</span>
              <span>•</span>
              <Calendar size={13} className="text-slate-500" />
              <span>Uploaded: {new Date(document.createdAt).toLocaleDateString()}</span>
            </p>
          </div>
        </div>

        <Link
          to={`/documents/${document._id}/chat`}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition self-start md:self-auto"
        >
          <MessageSquare size={15} /> Chat with this Document
        </Link>
      </div>

      {convertFeedback && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{convertFeedback}</span>
        </div>
      )}

      {/* Summaries */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-emerald-400" /> Executive Summary
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-[#0B0F19] p-4 rounded-xl border border-slate-800/80">
              {document.shortSummary}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Detailed Analysis</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              {document.detailedSummary}
            </p>
          </div>

          {/* Important Points */}
          {document.importantPoints?.length > 0 && (
            <div className="pt-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Key Takeaways</h4>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {document.importantPoints.map((pt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        {/* Sidebar: Key Entities & Dates */}
        <div className="space-y-6">
          {document.importantDates?.length > 0 && (
            <Card className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Calendar size={14} className="text-indigo-400" /> Important Dates
              </h4>
              <div className="space-y-2">
                {document.importantDates.map((d, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800 text-xs">
                    <span className="font-bold text-indigo-300 block">{d.date}</span>
                    <span className="text-slate-400 text-[11px]">{d.event}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {document.importantEntities?.length > 0 && (
            <Card className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Tag size={14} className="text-purple-400" /> Entities & Concepts
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {document.importantEntities.map((ent, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-lg bg-[#0B0F19] text-slate-300 border border-slate-800 text-[11px] font-medium">
                    {ent}
                  </span>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Action Items to Tasks */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckSquare size={16} className="text-indigo-400" /> Extracted Action Items
            </h3>
            <p className="text-xs text-slate-400">Click to convert directly into persistent Central Tasks</p>
          </div>
        </div>

        <div className="space-y-2">
          {document.actionItems?.length > 0 ? (
            document.actionItems.map((act, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F19] border border-slate-800/80 gap-3"
              >
                <div className="space-y-0.5 truncate">
                  <span className="text-xs font-medium text-slate-200 block truncate">{act.task}</span>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>Priority: {act.priority || 'Medium'}</span>
                    {act.deadline && <span>• Deadline: {act.deadline}</span>}
                  </div>
                </div>

                {act.convertedToTask ? (
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1 shrink-0">
                    <CheckCircle2 size={14} /> Converted
                  </span>
                ) : (
                  <button
                    onClick={() => handleConvertAction(idx)}
                    disabled={convertingIdx === idx}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shrink-0 flex items-center gap-1 disabled:opacity-50"
                  >
                    {convertingIdx === idx ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
                    Convert to Task
                  </button>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-500">No action items detected in this document.</p>
          )}
        </div>
      </Card>

      {/* Indexed Document Chunks Viewer */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers size={16} className="text-slate-400" /> Extracted Chunks ({chunks.length})
          </h3>
          <span className="text-xs text-slate-500">Searchable units used for AI context</span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
          {chunks.map((c) => (
            <div key={c._id} className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between text-[11px] text-indigo-400 font-semibold">
                <span>Chunk #{c.chunkIndex + 1} {c.pageNumber ? `(Page ${c.pageNumber})` : ''}</span>
                <span className="text-slate-500">{c.charCount} chars</span>
              </div>
              <p className="text-slate-300 line-clamp-3 leading-relaxed">{c.content}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

