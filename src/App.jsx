import React, { useState } from 'react';
import { Sparkles, Code2, Copy, CheckCircle, ArrowRight, Briefcase, Building2, Loader2, Download, AlertTriangle } from 'lucide-react';
import './App.css';

function App() {
  const [latexCode, setLatexCode] = useState(() => localStorage.getItem('cached_master_resume') || '');
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedLatex, setGeneratedLatex] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('preview'); // Default to preview
  const [pdfUrl, setPdfUrl] = useState('');
  const [isCompilingPdf, setIsCompilingPdf] = useState(false);
  const [pdfError, setPdfError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!latexCode || !jobDescription || !companyName) {
      alert('Please fill out all fields and paste your LaTeX resume.');
      return;
    }

    setIsProcessing(true);
    setGeneratedLatex('');

    try {
      const response = await fetch('/api/openrouter/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY || import.meta.env.VITE_OPENAI_API_KEY}`,
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'ResumeRefiner',
        },
        body: JSON.stringify({
          model: 'anthropic/claude-3-haiku',
          messages: [
            {
              role: 'system',
              content: `You are an expert ATS resume writer and LaTeX formatter. Your task is to tailor the provided LaTeX resume for the given job description to maximize ATS score. 
              Do not fabricate experience. Focus on rewording bullet points to match required keywords and skills heavily. Ensure the ATS match is as high as possible.
              IMPORTANT: Output ONLY the complete, raw, valid LaTeX code. Do NOT wrap it in markdown formatting blocks like \`\`\`latex or \`\`\`. Just output the pure LaTeX code.`
            },
            {
              role: 'user',
              content: `Target Company: ${companyName}\n\nJob Description:\n${jobDescription}\n\nOriginal LaTeX Resume:\n${latexCode}`
            }
          ],
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to communicate with OpenAI');
      }

      const data = await response.json();
      let tailoredLatex = data.choices[0].message.content;

      // Strip markdown code blocks if the AI accidentally included them
      tailoredLatex = tailoredLatex.replace(/```latex\s*/gi, '').replace(/```\s*/g, '');

      setGeneratedLatex(tailoredLatex);
      setIsProcessing(false);
      
      // Auto-compile PDF
      compilePdf(tailoredLatex);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setIsProcessing(false);
    }
  };

  const compilePdf = async (latexString) => {
    setIsCompilingPdf(true);
    setPdfError('');
    setPdfUrl('');
    
    try {
      const formData = new FormData();
      formData.append('filecontents[]', latexString);
      formData.append('filename[]', 'document.tex');
      formData.append('engine', 'pdflatex');
      formData.append('return', 'pdf');

      const response = await fetch('/api/texlive/cgi-bin/latexcgi', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to compile PDF');
      }
      
      const blob = await response.blob();
      
      if (blob.type !== 'application/pdf') {
        throw new Error("Compilation failed. Please use Overleaf to compile your exact template.");
      }

      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error(err);
      setPdfError('Failed to generate PDF preview.');
    } finally {
      setIsCompilingPdf(false);
    }
  };

  const downloadTex = () => {
    const blob = new Blob([generatedLatex], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shreyansh_${companyName.replace(/[^a-z0-9]/gi, '_')}.tex`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = () => {
    if (!pdfUrl) {
      alert("Please wait for the PDF to finish compiling!");
      return;
    }
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `shreyansh_${companyName.replace(/[^a-z0-9]/gi, '_')}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const openInOverleaf = () => {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.overleaf.com/docs';
    form.target = '_blank';
    
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = 'snip';
    input.value = generatedLatex;
    
    form.appendChild(input);
    document.body.appendChild(form);
    form.submit();
    document.body.removeChild(form);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLatex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="app-container">
      <header>
        <div className="title-container">
          <Sparkles className="logo-icon" />
          <h1>ResumeRefine</h1>
        </div>
        <p className="subtitle">
          Supercharge your job search. Paste your LaTeX resume and the job description, and our AI will generate a highly tailored, ATS-friendly LaTeX file.
        </p>
      </header>

      <main className="main-content">
        <div className="glass-card left-panel">
          <h2 className="section-title">
            <Code2 size={24} />
            Input Details
          </h2>

          {errorMsg && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5' }}>
              <AlertTriangle size={20} />
              <p style={{ fontSize: '0.9rem' }}>{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="latexCode">1. Paste Master Resume (LaTeX Code)</label>
              <div style={{ position: 'relative' }}>
                <Code2 size={18} style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--text-muted)' }} />
                <textarea
                  id="latexCode"
                  placeholder="Paste your raw \documentclass... LaTeX code here"
                  value={latexCode}
                  onChange={(e) => {
                    setLatexCode(e.target.value);
                    localStorage.setItem('cached_master_resume', e.target.value);
                  }}
                  style={{ paddingLeft: '2.5rem', minHeight: '200px', fontFamily: 'monospace' }}
                ></textarea>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="companyName">2. Target Company Name</label>
              <div style={{ position: 'relative' }}>
                <Building2 size={18} style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  id="companyName"
                  placeholder="e.g. Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="jobDescription">3. Job Description</label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={18} style={{ position: 'absolute', top: '1rem', left: '1rem', color: 'var(--text-muted)' }} />
                <textarea
                  id="jobDescription"
                  placeholder="Paste the full job description here..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                ></textarea>
              </div>
            </div>

            <button
              type="submit"
              className="action-button"
              disabled={isProcessing || !latexCode || !jobDescription || !companyName}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="loading-spinner" />
                  Optimizing for ATS...
                </>
              ) : (
                <>
                  Tailor LaTeX Resume
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="glass-card right-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          {!generatedLatex ? (
            <>
              <h2 className="section-title">
                <Sparkles size={24} />
                How it Works
              </h2>

              <div className="steps-container">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <h3>Provide LaTeX</h3>
                    <p>Paste your existing, ATS-friendly LaTeX resume code directly into the input field.</p>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <h3>AI Keyword Optimization</h3>
                    <p>Our advanced LLM analyzes the job description and rewrites your bullet points to match the required skills, maximizing your ATS score.</p>
                  </div>
                </div>

                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <h3>Generate .tex</h3>
                    <p>Get the fully updated, strictly-formatted LaTeX code back. You can copy it instantly or download it as a .tex file to compile in Overleaf or any LaTeX editor.</p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  <CheckCircle size={24} color="#10b981" />
                  Success! Tailored LaTeX
                </h2>

                <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '0.25rem', borderRadius: '8px' }}>
                  <button onClick={() => setActiveTab('code')} style={{ padding: '0.5rem 1rem', background: activeTab === 'code' ? 'var(--primary)' : 'transparent', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>
                    Code
                  </button>
                  <button onClick={() => setActiveTab('preview')} style={{ padding: '0.5rem 1rem', background: activeTab === 'preview' ? 'var(--primary)' : 'transparent', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '0.9rem', transition: 'all 0.2s' }}>
                    Live Preview
                  </button>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <button onClick={copyToClipboard} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {copied ? <CheckCircle size={16} /> : <Copy size={16} />}
                    {copied ? 'Copied!' : 'Copy Code'}
                  </button>
                  <button onClick={downloadTex} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Code2 size={16} />
                    .tex
                  </button>
                  <button onClick={openInOverleaf} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#47a141', borderColor: '#47a141', color: 'white' }}>
                    <Code2 size={16} />
                    Overleaf
                  </button>
                  <button onClick={downloadPdf} className="btn-secondary" style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', borderColor: 'var(--primary)', color: 'white' }}>
                    <Download size={16} />
                    Download PDF
                  </button>
                </div>
              </div>
              
              {activeTab === 'code' ? (
                <textarea 
                  readOnly
                  value={generatedLatex}
                  style={{ flex: 1, padding: '1.5rem', fontFamily: 'monospace', fontSize: '0.85rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'var(--text-main)', resize: 'none', minHeight: '400px', width: '100%' }}
                />
              ) : (
                <div style={{ flex: 1, padding: '0', background: 'white', borderRadius: '12px', minHeight: '400px', width: '100%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {isCompilingPdf ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#64748b' }}>
                      <Loader2 className="loading-spinner" size={32} style={{ marginBottom: '1rem' }} />
                      <p>Compiling PDF via TeX Live...</p>
                    </div>
                  ) : pdfError ? (
                    <p style={{ color: 'red', padding: '2rem', textAlign: 'center' }}>{pdfError}</p>
                  ) : pdfUrl ? (
                    <iframe src={`${pdfUrl}#toolbar=0`} style={{ width: '100%', height: '100%', border: 'none', minHeight: '600px' }} title="PDF Preview" />
                  ) : null}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
