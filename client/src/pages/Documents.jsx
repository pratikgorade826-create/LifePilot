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
  AlertCircle,
  Search,
  BookOpen,
  GitCompare,
  FileCheck,
  Tag,
  Zap,
  X,
  CheckSquare,
  Network
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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [globalSearchResults, setGlobalSearchResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [comparing, setComparing] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async (query = '') => {
    try {
      setLoading(true);
      const res = await documentsAPI.getAll(query);
      setDocuments(res.data.documents || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setGlobalSearchResults(null);
      loadDocuments();
      return;
    }

    try {
      setSearching(true);
      const res = await documentsAPI.searchAll(searchQuery);
      setGlobalSearchResults(res.data);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    const validExts = ['pdf', 'docx', 'txt'];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!validExts.includes(ext)) {
      setUploadError('Invalid format. Please upload PDF, DOCX, or TXT files.');
      return;
    }

    // Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File exceeds maximum size of 15MB.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    setUploadError('');
    setUploadSuccess('');
    setUploadProgress(20);

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => (prev < 85 ? prev + 15 : prev));
    }, 400);

    try {
      const res = await documentsAPI.upload(formData);
      clearInterval(progressTimer);
      setUploadProgress(100);
      setUploadSuccess(`"${file.name}" indexed successfully!`);
      loadDocuments();
      setTimeout(() => {
        setUploadSuccess('');
        setUploadProgress(0);
      }, 4000);
    } catch (err) {
      clearInterval(progressTimer);
      setUploadProgress(0);
      setUploadError(err.response?.data?.message || 'Document upload and parsing failed.');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this document and all extracted intelligence?')) return;

    try {
      await documentsAPI.delete(id);
      setDocuments(prev => prev.filter(d => d._id !== id));
      setSelectedDocIds(prev => prev.filter(item => item !== id));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const toggleSelectDoc = (id, e) => {
    e.stopPropagation();
    setSelectedDocIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleCompare = async () => {
    if (selectedDocIds.length < 2) return;
    try {
      setComparing(true);
      setShowCompareModal(true);
      const res = await documentsAPI.compare(selectedDocIds);
      setComparisonData(res.data.comparison);
    } catch (err) {
      console.error('Comparison error:', err);
      alert(err.response?.data?.message || 'Failed to compare documents');
      setShowCompareModal(false);
    } finally {
      setComparing(false);
    }
  };

  // Aggregated stats
  const totalChunks = documents.reduce((acc, d) => acc + (d.totalChunks || 0), 0);
  const totalActionItems = documents.reduce((acc, d) => acc + (d.actionItems?.length || 0), 0);
  const totalFlashcards = documents.reduce((acc, d) => acc + (d.studyMaterials?.flashcards?.length || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header & Metrics */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
            <BookOpen className="text-[#ffa952]" size={28} />
            Personal Knowledge Hub
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Intelligent document intelligence, multi-document cross-synthesis, RAG Q&A, and study tools.
          </p>
        </div>

        {/* Global Multi-Document Actions */}
        <div className="flex items-center gap-3">
          {selectedDocIds.length >= 2 && (
            <button
              onClick={handleCompare}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#ffa952] text-[#1f2328] hover:bg-[#ef5a5a] hover:text-white shadow-md transition"
            >
              <GitCompare size={16} />
              Compare Selected ({selectedDocIds.length})
            </button>
          )}

          <Link
            to="/assistant"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#ffe79a] text-[#1f2328] border border-[#ffa952]/40 hover:bg-[#ffa952] transition"
          >
            <Sparkles size={16} className="text-[#ef5a5a]" />
            Ask Global Assistant
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-[#ffa952]/20 flex items-center justify-center text-[#ffa952] shrink-0">
            <FileText size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-100">{documents.length}</div>
            <div className="text-xs text-slate-400">Total Documents</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-[#ef5a5a]/20 flex items-center justify-center text-[#ef5a5a] shrink-0">
            <Layers size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-100">{totalChunks}</div>
            <div className="text-xs text-slate-400">Indexed RAG Chunks</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-[#ffa952]/20 flex items-center justify-center text-[#ffa952] shrink-0">
            <CheckSquare size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-100">{totalActionItems}</div>
            <div className="text-xs text-slate-400">Extracted Actions</div>
          </div>
        </Card>

        <Card className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-xl bg-[#ef5a5a]/20 flex items-center justify-center text-[#ef5a5a] shrink-0">
            <Zap size={20} />
          </div>
          <div>
            <div className="text-xl font-bold text-slate-100">{totalFlashcards}</div>
            <div className="text-xs text-slate-400">Study Flashcards</div>
          </div>
        </Card>
      </div>

      {/* Upload Zone & Global Search Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Box (1 col) */}
        <Card className="lg:col-span-1 p-5 border-dashed border-2 border-[#ffa952]/50 hover:border-[#ef5a5a] transition relative flex flex-col justify-center items-center text-center">
          <input
            type="file"
            id="file-upload"
            accept=".pdf,.docx,.txt"
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
          />

          <div className="w-12 h-12 rounded-2xl bg-[#ffa952]/20 flex items-center justify-center text-[#ffa952] mb-3">
            {uploading ? <Loader2 size={24} className="animate-spin text-[#ef5a5a]" /> : <Upload size={24} />}
          </div>

          <h3 className="text-sm font-bold text-slate-100">
            {uploading ? 'Processing & Extracting...' : 'Upload Document'}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs">
            Drag & drop or browse <b>PDF</b>, <b>DOCX</b>, or <b>TXT</b> (Max 15MB).
          </p>

          {uploading && (
            <div className="w-full mt-4 space-y-1.5">
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#ffa952] to-[#ef5a5a] transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="text-[11px] text-slate-400">{uploadProgress}% complete</span>
            </div>
          )}

          {uploadError && (
            <div className="mt-3 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle size={14} className="shrink-0" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="mt-3 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
              <CheckCircle2 size={14} className="shrink-0" />
              <span>{uploadSuccess}</span>
            </div>
          )}
        </Card>

        {/* Global Semantic Search & Quick Chat Info (2 cols) */}
        <Card className="lg:col-span-2 p-5 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#ffa952] uppercase tracking-wider flex items-center gap-1.5">
                <Search size={14} /> Semantic & Keyword Document Search
              </span>
              {globalSearchResults && (
                <button
                  onClick={() => { setGlobalSearchResults(null); setSearchQuery(''); }}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Clear results
                </button>
              )}
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search across all document text, chunks, entities, and requirements..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-sm focus:outline-none focus:border-[#ffa952]"
                />
              </div>
              <button
                type="submit"
                disabled={searching}
                className="px-4 py-2.5 rounded-xl bg-[#ffa952] text-[#1f2328] font-bold text-xs hover:bg-[#ef5a5a] hover:text-white transition"
              >
                {searching ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
              </button>
            </form>
          </div>

          {/* Quick instructions / tips */}
          <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles size={14} className="text-[#ffa952]" />
              Tip: Select 2 or more document checkboxes to generate a side-by-side comparison report.
            </span>
            <span className="font-semibold text-slate-300">
              {selectedDocIds.length} Selected
            </span>
          </div>
        </Card>
      </div>

      {/* Global Search Results Display if Active */}
      {globalSearchResults && (
        <Card className="p-5 space-y-3 border border-[#ffa952]/40">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Search size={16} className="text-[#ffa952]" />
              Matching Excerpts for "{globalSearchResults.query}" ({globalSearchResults.totalResults})
            </h3>
          </div>

          {globalSearchResults.results.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">No matching chunks found for "{globalSearchResults.query}".</p>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
              {globalSearchResults.results.map((res, i) => (
                <div
                  key={i}
                  onClick={() => navigate(`/documents/${res.documentId}`)}
                  className="p-3 rounded-lg bg-slate-900/80 hover:bg-slate-800/80 border border-slate-800 transition cursor-pointer text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[#ffa952] font-semibold">
                    <span>{res.documentName}</span>
                    <span className="text-[10px] text-slate-400">Chunk {res.chunkIndex + 1} {res.pageNumber ? `(Page ${res.pageNumber})` : ''}</span>
                  </div>
                  <p className="text-slate-300 italic">"...{res.content}..."</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Document Library Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <FileText size={18} className="text-[#ffa952]" />
            Indexed Knowledge Library ({documents.length})
          </h2>
          {documents.length > 0 && (
            <span className="text-xs text-slate-400">
              Click any document to explore summaries, quizzes, flashcards & project converters.
            </span>
          )}
        </div>

        {loading ? (
          <div className="py-16 flex justify-center">
            <LoadingSpinner size="lg" text="Loading knowledge documents..." />
          </div>
        ) : documents.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No Documents Uploaded Yet"
            description="Upload your project specs, study guides, reports, or research papers to unlock AI summaries, quizzes, and automated action extraction."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {documents.map((doc) => {
              const isSelected = selectedDocIds.includes(doc._id);
              const actionsCount = doc.actionItems?.length || 0;
              const mcqCount = doc.studyMaterials?.mcqs?.length || 0;
              const flashcardsCount = doc.studyMaterials?.flashcards?.length || 0;

              return (
                <Card
                  key={doc._id}
                  hover
                  onClick={() => navigate(`/documents/${doc._id}`)}
                  className={`p-5 flex flex-col justify-between transition-all relative ${
                    isSelected ? 'ring-2 ring-[#ffa952] border-[#ffa952]' : ''
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header: Checkbox + Icon + Ext badge + Delete */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectDoc(doc._id, e)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded text-[#ffa952] accent-[#ffa952] cursor-pointer"
                          title="Select for comparison"
                        />
                        <div className="w-9 h-9 rounded-xl bg-[#ffa952]/15 flex items-center justify-center text-[#ffa952] shrink-0 font-bold text-xs uppercase">
                          {doc.fileType || 'DOC'}
                        </div>
                        <div className="overflow-hidden">
                          <h3 className="font-bold text-sm text-slate-100 truncate" title={doc.originalName}>
                            {doc.originalName}
                          </h3>
                          <span className="text-[11px] text-slate-400">
                            {(doc.fileSize / 1024).toFixed(1)} KB • {doc.totalChunks || 1} chunks
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDelete(doc._id, e)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                        title="Delete Document"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    {/* Executive Summary Snippet */}
                    <p className="text-xs text-slate-300 line-clamp-3 leading-relaxed">
                      {doc.shortSummary || 'Document extracted and indexed for natural language query answering and study materials.'}
                    </p>

                    {/* Extracted Intelligence Badges */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {actionsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffa952]/20 text-[#ffa952] border border-[#ffa952]/30">
                          {actionsCount} Action Items
                        </span>
                      )}
                      {mcqCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ef5a5a]/20 text-[#ef5a5a] border border-[#ef5a5a]/30">
                          {mcqCount} MCQs
                        </span>
                      )}
                      {flashcardsCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {flashcardsCount} Flashcards
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Footer: Quick Action Buttons */}
                  <div className="pt-4 border-t border-slate-800/80 mt-4 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/documents/${doc._id}/chat`);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-[#ffa952] hover:text-[#1f2328] text-slate-200 transition"
                      >
                        <MessageSquare size={13} />
                        Chat
                      </button>

                      <button
                        onClick={() => navigate(`/documents/${doc._id}`)}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#ffa952] text-[#1f2328] hover:bg-[#ef5a5a] hover:text-white transition"
                      >
                        <Eye size={13} />
                        Explore
                      </button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Multi-Document Comparison Modal */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-4xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-2xl p-6 overflow-y-auto space-y-6 scrollbar-thin shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ffa952]/20 flex items-center justify-center text-[#ffa952]">
                  <GitCompare size={22} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100">Multi-Document Intelligence Comparison</h2>
                  <p className="text-xs text-slate-400">Synthesizing common ground, divergences, and conflicting claims</p>
                </div>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-800"
              >
                <X size={20} />
              </button>
            </div>

            {comparing ? (
              <div className="py-20 flex justify-center">
                <LoadingSpinner size="lg" text="Running cross-document semantic comparison..." />
              </div>
            ) : comparisonData ? (
              <div className="space-y-6">
                {/* Unified Executive Synthesis */}
                <div className="p-4 rounded-xl bg-[#ffa952]/10 border border-[#ffa952]/30 space-y-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#ffa952] flex items-center gap-1.5">
                    <Sparkles size={14} /> Unified Cross-Document Synthesis
                  </span>
                  <p className="text-sm text-slate-200 leading-relaxed">{comparisonData.combinedSummary}</p>
                </div>

                {/* Common Topics */}
                {comparisonData.commonTopics && comparisonData.commonTopics.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <FileCheck size={16} className="text-emerald-400" />
                      Shared Themes & Common Points
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {comparisonData.commonTopics.map((item, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-1">
                          <h4 className="text-xs font-bold text-[#ffa952]">{item.topic}</h4>
                          <p className="text-xs text-slate-300">{item.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Thematic Differences */}
                {comparisonData.differences && comparisonData.differences.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <GitCompare size={16} className="text-amber-400" />
                      Key Differences & Divergent Focus
                    </h3>
                    <div className="space-y-2">
                      {comparisonData.differences.map((diff, idx) => (
                        <div key={idx} className="p-3.5 rounded-xl bg-slate-800/60 border border-slate-700/60 space-y-2 text-xs">
                          <div className="font-bold text-[#ffa952]">{diff.aspect}</div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
                            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                              <span className="font-semibold text-slate-400 block mb-1">Doc 1:</span>
                              {diff.documentAView}
                            </div>
                            <div className="p-2 rounded bg-slate-900/80 border border-slate-800">
                              <span className="font-semibold text-slate-400 block mb-1">Doc 2:</span>
                              {diff.documentBView}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Conflicting Information */}
                {comparisonData.conflicts && comparisonData.conflicts.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <AlertCircle size={16} className="text-rose-400" />
                      Conflicting Information & Discrepancies
                    </h3>
                    <div className="space-y-2">
                      {comparisonData.conflicts.map((conf, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs space-y-1">
                          <div className="font-bold text-rose-300">{conf.issue}</div>
                          <p className="text-slate-300">{conf.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actionable Takeaways */}
                {comparisonData.keyTakeaways && (
                  <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                    <h4 className="text-xs font-bold text-[#ffa952] uppercase tracking-wider">Recommended Next Steps</h4>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc pl-4">
                      {comparisonData.keyTakeaways.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};
