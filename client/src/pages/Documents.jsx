import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  Upload,
  Sparkles,
  MessageSquare,
  Eye,
  Trash2,
  Calendar,
  Layers,
  ArrowRight,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { documentsAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Documents = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await documentsAPI.getAll();
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File exceeds 15MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');

    try {
      const res = await documentsAPI.upload(formData);
      setUploadSuccess(`"${file.originalname}" processed & indexed!`);
      loadDocuments();
      setTimeout(() => setUploadSuccess(''), 4000);
    } catch (err) {
      setUploadError(err.response?.data?.message || 'File processing failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Delete this document and all its indexed chunks?')) return;
    try {
      await documentsAPI.delete(id);
      setDocuments((prev) => prev.filter((d) => d._id !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading your personal knowledge hub..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText size={22} className="text-emerald-400" />
            Personal Knowledge Hub
          </h1>
          <p className="text-xs text-slate-400">
            Upload PDFs, DOCX, or TXT documents to generate summaries, key findings, and query with citations.
          </p>
        </div>
      </div>

      {/* Upload Dropzone Card */}
      <Card className="border-dashed border-slate-700/80 bg-[#111827]/70 p-8 text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
            <Upload size={22} />
          </div>
          <h3 className="text-sm font-bold text-white">Upload Document for AI Intelligence</h3>
          <p className="text-xs text-slate-400">
            Supports PDF, DOCX, and TXT files up to 15MB. Content is chunked and summarized automatically.
          </p>

          {uploadError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {uploadError}
            </div>
          )}

          {uploadSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400">
              {uploadSuccess}
            </div>
          )}

          <div className="pt-2">
            <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg shadow-emerald-500/20 transition">
              {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
              <span>{uploading ? 'Extracting & Chunking...' : 'Select Document'}</span>
              <input
                type="file"
                accept=".pdf,.docx,.doc,.txt"
                onChange={handleFileUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </Card>

      {/* Documents Grid */}
      {documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <Card key={doc._id} hover className="h-full flex flex-col justify-between group">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Badge variant="cyan">{doc.fileType.toUpperCase()}</Badge>
                  <button
                    onClick={(e) => handleDelete(e, doc._id)}
                    className="p-1 text-slate-500 hover:text-rose-400 rounded transition opacity-0 group-hover:opacity-100"
                    title="Delete document"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-white mb-2 line-clamp-1 group-hover:text-emerald-400 transition">
                  {doc.originalName}
                </h3>

                <p className="text-xs text-slate-400 line-clamp-3 mb-4 leading-relaxed">
                  {doc.shortSummary || 'Extracted document content.'}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 py-3 border-y border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Layers size={13} className="text-emerald-400" />
                    <span>{doc.totalChunks || 1} Chunks</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={13} className="text-slate-500" />
                    <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="col-span-2 text-indigo-400 font-medium">
                    {doc.actionItems?.length || 0} Action Items Extracted
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-2 flex items-center justify-between text-xs font-semibold gap-2">
                <Link
                  to={`/documents/${doc._id}`}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-center transition flex items-center justify-center gap-1"
                >
                  <Eye size={13} /> View Insights
                </Link>
                <Link
                  to={`/documents/${doc._id}/chat`}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-center transition flex items-center justify-center gap-1"
                >
                  <MessageSquare size={13} /> Ask AI
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title="No Documents Uploaded"
          description="Upload project requirements, contracts, or study materials to unleash AI document intelligence."
        />
      )}
    </div>
  );
};
