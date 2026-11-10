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
  Trash2,
  BookOpen,
  HelpCircle,
  Zap,
  FolderPlus,
  RefreshCw,
  GitBranch,
  Award,
  ChevronRight,
  Send,
  RotateCw,
  AlertCircle,
  FileCode,
  Network
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
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'chapters' | 'study' | 'actions' | 'research' | 'graph' | 'chunks'

  // Study Assistant State
  const [studySubTab, setStudySubTab] = useState('mcq'); // 'mcq' | 'flashcards' | 'descriptive' | 'notes' | 'plan'
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [currentFlashcardIdx, setCurrentFlashcardIdx] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);
  const [userDescriptiveAnswers, setUserDescriptiveAnswers] = useState({});
  const [evaluatingQuestionIdx, setEvaluatingQuestionIdx] = useState(null);
  const [evaluationResults, setEvaluationResults] = useState({});

  // Action & Project Conversion State
  const [convertingIdx, setConvertingIdx] = useState(null);
  const [convertingAll, setConvertingAll] = useState(false);
  const [convertingProject, setConvertingProject] = useState(false);
  const [actionFeedback, setActionFeedback] = useState('');

  // Research & Graph state
  const [researchData, setResearchData] = useState(null);
  const [loadingResearch, setLoadingResearch] = useState(false);
  const [graphData, setGraphData] = useState(null);
  const [loadingGraph, setLoadingGraph] = useState(false);

  useEffect(() => {
    loadDocument();
  }, [id]);

  const loadDocument = async () => {
    try {
      setLoading(true);
      const res = await documentsAPI.getOne(id);
      setDocument(res.data.document);
      setChunks(res.data.sampleChunks || []);
      if (res.data.document.researchAnalysis) setResearchData(res.data.document.researchAnalysis);
      if (res.data.document.knowledgeGraph) setGraphData(res.data.document.knowledgeGraph);
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
      setActionFeedback(`Converted to Task: "${res.data.task?.title}"!`);

      const updatedActions = [...document.actionItems];
      updatedActions[idx].convertedToTask = true;
      setDocument({ ...document, actionItems: updatedActions });

      setTimeout(() => setActionFeedback(''), 4000);
    } catch (err) {
      console.error('Conversion failed:', err);
      alert('Failed to convert action item to task.');
    } finally {
      setConvertingIdx(null);
    }
  };

  const handleConvertAllActions = async () => {
    try {
      setConvertingAll(true);
      const res = await documentsAPI.convertAllActions(id);
      setActionFeedback(res.data.message);

      const updatedActions = document.actionItems.map(a => ({ ...a, convertedToTask: true }));
      setDocument({ ...document, actionItems: updatedActions });

      setTimeout(() => setActionFeedback(''), 4000);
    } catch (err) {
      console.error('Convert all failed:', err);
    } finally {
      setConvertingAll(false);
    }
  };

  const handleConvertProject = async () => {
    try {
      setConvertingProject(true);
      const res = await documentsAPI.convertProject(id);
      setActionFeedback(`Project "${res.data.project?.name}" created with ${res.data.tasks?.length || 0} tasks!`);

      if (document.extractedProjectRoadmap) {
        setDocument({
          ...document,
          extractedProjectRoadmap: {
            ...document.extractedProjectRoadmap,
            convertedToProject: true
          }
        });
      }

      setTimeout(() => setActionFeedback(''), 5000);
    } catch (err) {
      console.error('Project conversion failed:', err);
      alert('Failed to convert roadmap to project.');
    } finally {
      setConvertingProject(false);
    }
  };

  const handleEvaluateAnswer = async (qIdx, question, modelAnswer) => {
    const userAnswer = userDescriptiveAnswers[qIdx];
    if (!userAnswer || !userAnswer.trim()) {
      alert('Please type your answer before submitting for evaluation.');
      return;
    }

    try {
      setEvaluatingQuestionIdx(qIdx);
      const res = await documentsAPI.evaluateAnswer(id, question, modelAnswer, userAnswer);
      setEvaluationResults(prev => ({
        ...prev,
        [qIdx]: res.data.evaluation
      }));
    } catch (err) {
      console.error('Evaluation failed:', err);
    } finally {
      setEvaluatingQuestionIdx(null);
    }
  };

  const loadResearchAnalysis = async () => {
    try {
      setLoadingResearch(true);
      const res = await documentsAPI.getResearchAnalysis(id);
      setResearchData(res.data.researchAnalysis);
    } catch (err) {
      console.error('Research fetch failed:', err);
    } finally {
      setLoadingResearch(false);
    }
  };

  const loadKnowledgeGraph = async () => {
    try {
      setLoadingGraph(true);
      const res = await documentsAPI.getKnowledgeGraph(id);
      setGraphData(res.data.knowledgeGraph);
    } catch (err) {
      console.error('Graph fetch failed:', err);
    } finally {
      setLoadingGraph(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <LoadingSpinner size="lg" text="Loading Knowledge Hub document..." />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-20 space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Document Not Found</h2>
        <Link to="/documents" className="px-4 py-2 rounded-xl bg-[#ffa952] text-[#1f2328] font-bold text-xs">
          Return to Knowledge Hub
        </Link>
      </div>
    );
  }

  const study = document.studyMaterials || {};
  const mcqs = study.mcqs || [];
  const flashcards = study.flashcards || [];
  const descriptiveQs = study.descriptiveQuestions || [];
  const notes = study.studyNotes || [];
  const revisionPlan = study.revisionPlan || [];
  const chapters = document.chapterSummaries || [];
  const roadmap = document.extractedProjectRoadmap || {};

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Quick Launch Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/documents')}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition"
            title="Back to Documents"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#ffa952]/20 text-[#ffa952] border border-[#ffa952]/30">
                {document.fileType}
              </span>
              <h1 className="text-xl font-bold text-slate-100 truncate max-w-xl">
                {document.originalName}
              </h1>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {(document.fileSize / 1024).toFixed(1)} KB • {document.totalCharacters} characters • {document.totalChunks} chunks indexed
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            to={`/documents/${document._id}/chat`}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#ffa952] text-[#1f2328] hover:bg-[#ef5a5a] hover:text-white shadow-md transition"
          >
            <MessageSquare size={16} />
            Ask Document AI
          </Link>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {actionFeedback && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{actionFeedback}</span>
          </div>
          <button onClick={() => setActionFeedback('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Primary Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800 scrollbar-none text-xs font-bold">
        {[
          { key: 'summary', label: 'Overview & Summary', icon: Sparkles },
          { key: 'chapters', label: `Chapters (${chapters.length})`, icon: BookOpen },
          { key: 'study', label: 'AI Study Assistant', icon: HelpCircle },
          { key: 'actions', label: `Actions & Roadmap (${document.actionItems?.length || 0})`, icon: CheckSquare },
          { key: 'research', label: 'Research Analysis', icon: Award },
          { key: 'graph', label: 'Knowledge Graph', icon: Network },
          { key: 'chunks', label: `RAG Chunks (${document.totalChunks || chunks.length})`, icon: Layers }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                if (tab.key === 'research' && !researchData) loadResearchAnalysis();
                if (tab.key === 'graph' && !graphData) loadKnowledgeGraph();
              }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition whitespace-nowrap ${
                isActive
                  ? 'bg-[#ffa952] text-[#1f2328] shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: EXECUTIVE SUMMARY */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* Executive Short Summary */}
          <Card className="p-6 bg-gradient-to-br from-[#ffa952]/15 via-transparent to-[#ef5a5a]/10 border border-[#ffa952]/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#ffa952] flex items-center gap-1.5">
                <Sparkles size={14} /> Executive Summary
              </span>
              <span className="text-[11px] text-slate-400">AI Synthesized</span>
            </div>
            <p className="text-sm font-medium text-slate-100 leading-relaxed">
              {document.shortSummary}
            </p>
          </Card>

          {/* Detailed Paragraph Breakdown */}
          {document.detailedSummary && (
            <Card className="p-6 space-y-2">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FileText size={16} className="text-[#ffa952]" />
                Comprehensive Analysis
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                {document.detailedSummary}
              </p>
            </Card>
          )}

          {/* Key Findings & Important Points Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-emerald-400" />
                Critical Points & Deliverables
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {(document.importantPoints || []).map((pt, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ffa952] mt-1.5 shrink-0" />
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Zap size={16} className="text-[#ef5a5a]" />
                Key Findings & Conclusions
              </h3>
              <ul className="space-y-2 text-xs text-slate-300">
                {(document.keyFindings || []).map((kf, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#ef5a5a] mt-1.5 shrink-0" />
                    <span>{kf}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          {/* Important Dates & Key Entities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Calendar size={16} className="text-[#ffa952]" />
                Milestone Dates & Deadlines
              </h3>
              {(document.importantDates || []).length === 0 ? (
                <p className="text-xs text-slate-400">No explicit dates detected in document text.</p>
              ) : (
                <div className="space-y-2">
                  {document.importantDates.map((item, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-start justify-between gap-3">
                      <span className="font-bold text-[#ffa952] shrink-0">{item.date || 'TBD'}</span>
                      <span className="text-slate-300 text-right">{item.event}</span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Tag size={16} className="text-[#ef5a5a]" />
                Key Entities & Conceptual Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {(document.importantEntities || []).map((ent, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 rounded-xl text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700/80"
                  >
                    {ent}
                  </span>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: CHAPTER BREAKDOWN */}
      {activeTab === 'chapters' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">Chapter & Section Summaries</h3>
            <span className="text-xs text-slate-400">Detailed contextual sequence of document topics</span>
          </div>

          {chapters.length === 0 ? (
            <p className="text-xs text-slate-400 py-8 text-center">No chapter divisions extracted.</p>
          ) : (
            <div className="space-y-4">
              {chapters.map((chap, idx) => (
                <Card key={idx} className="p-5 space-y-3 border-l-4 border-l-[#ffa952]">
                  <h4 className="text-sm font-bold text-[#ffa952]">{chap.title}</h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{chap.summary}</p>
                  {chap.keyPoints && chap.keyPoints.length > 0 && (
                    <div className="pt-2 border-t border-slate-800 space-y-1">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Takeaways:</span>
                      <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                        {chap.keyPoints.map((kp, kIdx) => (
                          <li key={kIdx}>{kp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: AI STUDY ASSISTANT */}
      {activeTab === 'study' && (
        <div className="space-y-6">
          {/* Study Assistant Sub-Navigation */}
          <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-xl w-fit border border-slate-800 text-xs font-bold">
            {[
              { key: 'mcq', label: `MCQ Quiz (${mcqs.length})` },
              { key: 'flashcards', label: `Flashcards (${flashcards.length})` },
              { key: 'descriptive', label: `Descriptive Q&A (${descriptiveQs.length})` },
              { key: 'notes', label: `Study Notes (${notes.length})` },
              { key: 'plan', label: '5-Day Revision Plan' }
            ].map(sub => (
              <button
                key={sub.key}
                onClick={() => setStudySubTab(sub.key)}
                className={`px-3 py-1.5 rounded-lg transition ${
                  studySubTab === sub.key
                    ? 'bg-[#ffa952] text-[#1f2328]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          {/* SUBTAB: MCQS */}
          {studySubTab === 'mcq' && (
            <div className="space-y-5">
              {mcqs.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No MCQs generated for this document.</p>
              ) : (
                mcqs.map((mcq, qIdx) => {
                  const userAnswer = selectedAnswers[qIdx];
                  const hasAnswered = userAnswer !== undefined;
                  const isCorrect = userAnswer === mcq.answer;

                  return (
                    <Card key={qIdx} className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <h4 className="text-sm font-bold text-slate-100">
                          {qIdx + 1}. {mcq.question}
                        </h4>
                        {hasAnswered && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}>
                            {isCorrect ? 'Correct (+1)' : 'Incorrect'}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {mcq.options.map((opt, optIdx) => {
                          const isOptionSelected = userAnswer === optIdx;
                          const isOptionCorrect = mcq.answer === optIdx;

                          let btnClasses = 'bg-slate-900 border-slate-800 text-slate-300 hover:border-[#ffa952]';
                          if (hasAnswered) {
                            if (isOptionCorrect) {
                              btnClasses = 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold';
                            } else if (isOptionSelected) {
                              btnClasses = 'bg-rose-500/20 border-rose-500 text-rose-300 font-bold';
                            } else {
                              btnClasses = 'bg-slate-900/50 border-slate-800/50 text-slate-500';
                            }
                          }

                          return (
                            <button
                              key={optIdx}
                              disabled={hasAnswered}
                              onClick={() => setSelectedAnswers({ ...selectedAnswers, [qIdx]: optIdx })}
                              className={`p-3 rounded-xl border text-xs text-left transition ${btnClasses}`}
                            >
                              <span className="font-bold mr-2 text-slate-400">
                                {String.fromCharCode(65 + optIdx)}.
                              </span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>

                      {hasAnswered && mcq.explanation && (
                        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
                          <span className="font-bold text-[#ffa952] block">Explanation:</span>
                          <p>{mcq.explanation}</p>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* SUBTAB: FLASHCARDS */}
          {studySubTab === 'flashcards' && (
            <div className="max-w-xl mx-auto space-y-6">
              {flashcards.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No flashcards generated.</p>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Card {currentFlashcardIdx + 1} of {flashcards.length}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {flashcards[currentFlashcardIdx]?.category || 'Concept'}
                    </span>
                  </div>

                  {/* Flashcard Body with Click-to-Flip */}
                  <div
                    onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                    className="min-h-56 p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800/90 to-slate-900 border-2 border-[#ffa952]/40 hover:border-[#ffa952] cursor-pointer transition-all duration-300 flex flex-col justify-between text-center select-none shadow-xl"
                  >
                    <span className="text-[11px] font-bold text-[#ffa952] uppercase tracking-wider">
                      {flashcardFlipped ? 'Answer / Explanation' : 'Concept / Question'}
                    </span>

                    <div className="py-6">
                      <p className="text-base font-semibold text-slate-100">
                        {flashcardFlipped
                          ? flashcards[currentFlashcardIdx]?.back
                          : flashcards[currentFlashcardIdx]?.front}
                      </p>
                    </div>

                    <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
                      <RotateCw size={11} /> Click card to flip
                    </span>
                  </div>

                  {/* Navigation Controls */}
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        setFlashcardFlipped(false);
                        setCurrentFlashcardIdx(prev => Math.max(0, prev - 1));
                      }}
                      disabled={currentFlashcardIdx === 0}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40"
                    >
                      Previous Card
                    </button>

                    <button
                      onClick={() => {
                        setFlashcardFlipped(false);
                        setCurrentFlashcardIdx(prev => Math.min(flashcards.length - 1, prev + 1));
                      }}
                      disabled={currentFlashcardIdx === flashcards.length - 1}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-[#ffa952] text-[#1f2328] hover:bg-[#ef5a5a] hover:text-white disabled:opacity-40"
                    >
                      Next Card
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* SUBTAB: DESCRIPTIVE QUESTIONS WITH AI ANSWER EVALUATOR */}
          {studySubTab === 'descriptive' && (
            <div className="space-y-6">
              {descriptiveQs.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No descriptive questions available.</p>
              ) : (
                descriptiveQs.map((dq, qIdx) => {
                  const evalResult = evaluationResults[qIdx];
                  const isEvaluating = evaluatingQuestionIdx === qIdx;

                  return (
                    <Card key={qIdx} className="p-6 space-y-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-[#ffa952] uppercase tracking-wider">Practice Question {qIdx + 1}</span>
                        <h4 className="text-sm font-bold text-slate-100">{dq.question}</h4>
                      </div>

                      {/* User Input Textarea */}
                      <div className="space-y-2">
                        <textarea
                          rows={3}
                          value={userDescriptiveAnswers[qIdx] || ''}
                          onChange={(e) => setUserDescriptiveAnswers({ ...userDescriptiveAnswers, [qIdx]: e.target.value })}
                          placeholder="Type your explanation or essay response here to test your retention..."
                          className="w-full p-3 rounded-xl bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-[#ffa952]"
                        />

                        <div className="flex justify-end">
                          <button
                            disabled={isEvaluating}
                            onClick={() => handleEvaluateAnswer(qIdx, dq.question, dq.modelAnswer)}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#ffa952] text-[#1f2328] hover:bg-[#ef5a5a] hover:text-white transition disabled:opacity-50"
                          >
                            {isEvaluating ? <Loader2 size={14} className="animate-spin" /> : <Award size={14} />}
                            Evaluate My Answer
                          </button>
                        </div>
                      </div>

                      {/* Real-time AI Evaluation Output */}
                      {evalResult && (
                        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 animate-fade-in text-xs">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-bold text-slate-200">AI Grading Verdict: <b className="text-[#ffa952]">{evalResult.verdict}</b></span>
                            <span className="px-2 py-0.5 rounded text-xs font-bold bg-[#ffa952]/20 text-[#ffa952]">
                              Score: {evalResult.score}/100
                            </span>
                          </div>

                          <p className="text-slate-300 italic">{evalResult.feedback}</p>

                          {evalResult.strengths?.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-emerald-400">Strengths:</span>
                              <ul className="list-disc pl-4 text-slate-300 space-y-0.5">
                                {evalResult.strengths.map((str, i) => <li key={i}>{str}</li>)}
                              </ul>
                            </div>
                          )}

                          {evalResult.missedPoints?.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[11px] font-bold text-rose-400">Missed Points to Include:</span>
                              <ul className="list-disc pl-4 text-slate-300 space-y-0.5">
                                {evalResult.missedPoints.map((mp, i) => <li key={i}>{mp}</li>)}
                              </ul>
                            </div>
                          )}

                          <details className="pt-2 text-[11px] text-slate-400 cursor-pointer">
                            <summary className="font-semibold text-[#ffa952]">View Reference Model Answer</summary>
                            <p className="pt-2 text-slate-300 whitespace-pre-line bg-slate-950 p-3 rounded-lg mt-1 border border-slate-800">
                              {dq.modelAnswer}
                            </p>
                          </details>
                        </div>
                      )}
                    </Card>
                  );
                })
              )}
            </div>
          )}

          {/* SUBTAB: STUDY NOTES */}
          {studySubTab === 'notes' && (
            <div className="space-y-4">
              {notes.length === 0 ? (
                <p className="text-xs text-slate-400 py-8 text-center">No study notes available.</p>
              ) : (
                notes.map((note, i) => (
                  <Card key={i} className="p-5 space-y-2.5">
                    <h4 className="text-sm font-bold text-[#ffa952]">{note.topic}</h4>
                    <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">{note.notes}</p>
                    {note.keyTakeaways && (
                      <div className="pt-2 border-t border-slate-800">
                        <ul className="text-xs text-slate-400 list-disc pl-4 space-y-0.5">
                          {note.keyTakeaways.map((kt, kIdx) => <li key={kIdx}>{kt}</li>)}
                        </ul>
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* SUBTAB: REVISION PLAN */}
          {studySubTab === 'plan' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-100">Structured 5-Day Retention Schedule</h3>
              <div className="space-y-2.5">
                {revisionPlan.map((dayPlan, i) => (
                  <div key={i} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-4 text-xs">
                    <div className="w-12 h-12 rounded-xl bg-[#ffa952]/20 flex flex-col items-center justify-center font-bold text-[#ffa952] shrink-0">
                      <span className="text-[10px] text-slate-400">DAY</span>
                      <span className="text-base">{dayPlan.day || i + 1}</span>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-slate-100">{dayPlan.focusTopic}</h4>
                        <span className="text-[11px] text-slate-400">{dayPlan.durationMinutes || 45} mins</span>
                      </div>
                      <ul className="text-slate-300 space-y-0.5 list-disc pl-4">
                        {(dayPlan.tasks || []).map((t, tIdx) => (
                          <li key={tIdx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: KNOWLEDGE-TO-ACTION (TASKS & PROJECT CONVERSION) */}
      {activeTab === 'actions' && (
        <div className="space-y-6">
          {/* Action Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <CheckSquare size={16} className="text-[#ffa952]" />
                  Extracted Action Items ({document.actionItems?.length || 0})
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Approve individual items or sync all to your Central LifePilot Task Manager</p>
              </div>

              {document.actionItems?.some(a => !a.convertedToTask) && (
                <button
                  disabled={convertingAll}
                  onClick={handleConvertAllActions}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#ffa952] text-[#1f2328] hover:bg-[#ef5a5a] hover:text-white transition disabled:opacity-50"
                >
                  {convertingAll ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  Convert All to Tasks
                </button>
              )}
            </div>

            <div className="space-y-2">
              {(document.actionItems || []).map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-[#ffa952] mt-1.5 shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-100">{item.task}</span>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span className="text-[#ffa952]">Priority: {item.priority || 'Medium'}</span>
                        {item.deadline && <span>• Target: {item.deadline}</span>}
                      </div>
                    </div>
                  </div>

                  <div>
                    {item.convertedToTask ? (
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={11} /> Saved as Task
                      </span>
                    ) : (
                      <button
                        disabled={convertingIdx === idx}
                        onClick={() => handleConvertAction(idx)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-[#ffa952] hover:text-[#1f2328] text-slate-200 transition"
                      >
                        {convertingIdx === idx ? <Loader2 size={13} className="animate-spin" /> : 'Convert to Task'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Complete Project Roadmap Converter */}
          {roadmap.milestones && roadmap.milestones.length > 0 && (
            <Card className="p-6 space-y-4 border border-[#ffa952]/40 bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-800">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-[#ffa952] uppercase tracking-wider flex items-center gap-1">
                    <FolderPlus size={13} /> Project Roadmap Extraction
                  </span>
                  <h4 className="text-base font-bold text-slate-100">{roadmap.projectName || 'Synthesized Project'}</h4>
                  <p className="text-xs text-slate-400">{roadmap.description}</p>
                </div>

                {roadmap.convertedToProject ? (
                  <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-400 flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 size={14} /> Converted to Active Project
                  </span>
                ) : (
                  <button
                    disabled={convertingProject}
                    onClick={handleConvertProject}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#ffa952] text-[#1f2328] hover:bg-[#ef5a5a] hover:text-white shadow-md transition shrink-0 disabled:opacity-50"
                  >
                    {convertingProject ? <Loader2 size={14} className="animate-spin" /> : <FolderPlus size={14} />}
                    Approve & Create Project
                  </button>
                )}
              </div>

              {/* Milestones Preview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {roadmap.milestones.map((m, mIdx) => (
                  <div key={mIdx} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-2">
                    <span className="font-bold text-[#ffa952]">{m.title}</span>
                    <p className="text-slate-400 text-[11px]">{m.description}</p>
                    {m.tasks && (
                      <ul className="space-y-1 text-slate-300 list-disc pl-3 text-[11px]">
                        {m.tasks.map((t, tIdx) => (
                          <li key={tIdx}>{t}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 5: RESEARCH PAPER ANALYSIS */}
      {activeTab === 'research' && (
        <div className="space-y-5">
          {loadingResearch ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner size="md" text="Running scholarly paper analysis..." />
            </div>
          ) : researchData ? (
            <div className="space-y-4">
              <Card className="p-5 space-y-2 border-l-4 border-l-[#ffa952]">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#ffa952]">Abstract Synthesis</h4>
                <p className="text-xs text-slate-200 leading-relaxed">{researchData.abstractSummary}</p>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <FileCode size={14} className="text-[#ffa952]" /> Methodology & Architecture
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{researchData.methodology}</p>
                </Card>

                <Card className="p-5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Zap size={14} className="text-emerald-400" /> Empirical Findings & Results
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{researchData.keyResults}</p>
                </Card>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <AlertCircle size={14} className="text-amber-400" /> Critical Review & Evaluation
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">{researchData.criticalEvaluation}</p>
                </Card>

                <Card className="p-5 space-y-2">
                  <h4 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                    <Tag size={14} className="text-[#ef5a5a]" /> Practical Industry Applications
                  </h4>
                  <ul className="text-xs text-slate-300 list-disc pl-4 space-y-1">
                    {(researchData.practicalApplications || []).map((app, i) => <li key={i}>{app}</li>)}
                  </ul>
                </Card>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* TAB 6: KNOWLEDGE GRAPH */}
      {activeTab === 'graph' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Network size={16} className="text-[#ffa952]" />
              Entity & Concept Relationship Graph
            </h3>
            <span className="text-xs text-slate-400">Semantic connections extracted from text</span>
          </div>

          {loadingGraph ? (
            <div className="py-16 flex justify-center">
              <LoadingSpinner size="md" text="Extracting knowledge nodes and relationships..." />
            </div>
          ) : graphData?.nodes ? (
            <Card className="p-6 space-y-6 bg-slate-950 border border-slate-800">
              {/* Nodes list */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identified Concept Nodes:</span>
                <div className="flex flex-wrap gap-2">
                  {graphData.nodes.map((node, i) => (
                    <div
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 border border-[#ffa952]/40 text-xs text-slate-100 flex items-center gap-1.5"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#ffa952]" />
                      <span className="font-semibold">{node.label}</span>
                      <span className="text-[10px] text-slate-500 uppercase">({node.type})</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Edges list */}
              <div className="space-y-2 pt-4 border-t border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Relationship Links:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  {graphData.edges.map((edge, i) => {
                    const fromLabel = graphData.nodes.find(n => n.id === edge.from)?.label || edge.from;
                    const toLabel = graphData.nodes.find(n => n.id === edge.to)?.label || edge.to;
                    return (
                      <div key={i} className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-slate-300">
                        <span className="truncate font-semibold">{fromLabel}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] bg-[#ffa952]/20 text-[#ffa952] shrink-0 mx-1">
                          {edge.relationship}
                        </span>
                        <span className="truncate font-semibold text-right">{toLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Card>
          ) : null}
        </div>
      )}

      {/* TAB 7: RAG CHUNKS */}
      {activeTab === 'chunks' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">Indexed Document Chunks ({chunks.length})</h3>
            <span className="text-xs text-slate-400">Verifiable chunks used for contextual RAG retrieval</span>
          </div>

          <div className="space-y-3">
            {chunks.map((chunk, idx) => (
              <Card key={idx} className="p-4 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                  <span className="font-bold text-[#ffa952]">
                    Chunk {chunk.chunkIndex + 1} {chunk.pageNumber ? `• Page ${chunk.pageNumber}` : ''}
                  </span>
                  <span>{chunk.charCount} characters</span>
                </div>
                <p className="text-slate-300 leading-relaxed font-mono text-[11px] bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                  {chunk.content}
                </p>
                {chunk.keywords && chunk.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {chunk.keywords.map((kw, kIdx) => (
                      <span key={kIdx} className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400">
                        #{kw}
                      </span>
                    ))}
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
