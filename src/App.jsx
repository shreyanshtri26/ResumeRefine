import React, { useState, useRef } from 'react';
import { Sparkles, FileText, UploadCloud, X, CheckCircle, ArrowRight, Briefcase, Building2, Loader2, Download, AlertTriangle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import html2pdf from 'html2pdf.js';
import './App.css';

// Initialize PDF.js worker using local file to avoid CDN import errors
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

function App() {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [generatedHTML, setGeneratedHTML] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'application/pdf' || droppedFile.name.toLowerCase().endsWith('.pdf')) {
        setFile(droppedFile);
      } else {
        alert('Please upload a PDF file.');
      }
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const removeFile = (e) => {
    e.preventDefault();
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const extractTextFromPDF = async (pdfFile) => {
    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const strings = content.items.map(item => item.str);
      text += strings.join(' ') + '\n';
    }
    return text;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!file || !jobDescription || !companyName) {
      alert('Please fill out all fields and upload your resume.');
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Extract text from PDF
      const resumeText = await extractTextFromPDF(file);

      // 2. Call OpenAI API
      const response = await fetch('/api/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `Act as a professional resume writer. Your task is to tailor the provided resume for a specific job description. 
              Do not fabricate experience. Focus on rewording existing bullet points to better align with the job's required keywords and skills. 
              IMPORTANT: YOU MUST RETURN THE OUTPUT AS A VALID HTML DOCUMENT. 
              NEVER output LaTeX. NEVER output Markdown. Do NOT use \`\`\`html tags. 
              Use clean typography, h1 for names, h2 for sections, and ul/li for bullet points. Output ONLY the raw HTML code.`
            },
            {
              role: 'user',
              content: `Target Company: ${companyName}\n\nJob Description:\n${jobDescription}\n\nOriginal Resume:\n${resumeText}`
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
      let tailoredHTML = data.choices[0].message.content;

      // Strip markdown code blocks if the AI included them
      tailoredHTML = tailoredHTML.replace(/```html\s*/gi, '').replace(/```\s*/g, '');

      setGeneratedHTML(tailoredHTML);
      setIsProcessing(false);
      setIsSuccess(true);

    } catch (err) {
      console.error(err);
      setErrorMsg(err.message);
      setIsProcessing(false);
    }
  };

  const downloadPDF = () => {
    try {
      const element = document.createElement('div');
      element.innerHTML = generatedHTML;

      // Inject some basic styling into the generated PDF
      element.style.padding = '40px';
      element.style.fontFamily = 'Helvetica, Arial, sans-serif';
      element.style.color = '#333';
      element.style.lineHeight = '1.6';
      element.style.fontSize = '14px';
      element.style.background = 'white'; // Ensure background is white

      // Temporarily append to DOM to ensure layout is computed correctly for html2canvas
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '-9999px';
      document.body.appendChild(element);

      const opt = {
        margin: 0.5,
        filename: `${companyName.replace(/[^a-z0-9]/gi, '_')}_Resume.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(element).save().then(() => {
        document.body.removeChild(element);
      }).catch(err => {
        console.error('PDF Generation Error:', err);
        alert('Failed to generate PDF. Check console for details.');
        document.body.removeChild(element);
      });
    } catch (err) {
      console.error('PDF Generation Sync Error:', err);
      alert('Error: ' + err.message);
    }
  };

  const resetForm = () => {
    setFile(null);
    setJobDescription('');
    setCompanyName('');
    setIsSuccess(false);
    setGeneratedHTML('');
    setErrorMsg('');
  };

  return (
    <div className="app-container">
      <header>
        <div className="title-container">
          <Sparkles className="logo-icon" />
          <h1>ResumeRefine</h1>
        </div>
        <p className="subtitle">
          Supercharge your job search. Our AI analyzes your master resume and the job description to generate a perfectly tailored PDF in seconds.
        </p>
      </header>

      <main className="main-content">
        <div className="glass-card left-panel">
          <h2 className="section-title">
            <FileText size={24} />
            Tailor Your Application
          </h2>

          {errorMsg && (
            <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid #ef4444', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#fca5a5' }}>
              <AlertTriangle size={20} />
              <p style={{ fontSize: '0.9rem' }}>{errorMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>1. Upload Master Resume (PDF)</label>

              {!file ? (
                <div
                  className={`file-upload-area ${isDragging ? 'dragover' : ''}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <input
                    type="file"
                    className="file-input"
                    accept=".pdf"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <div className="file-upload-content">
                    <UploadCloud className="upload-icon" />
                    <p><strong>Click to upload</strong> or drag and drop</p>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>PDF up to 5MB</p>
                  </div>
                </div>
              ) : (
                <div className="selected-file">
                  <FileText className="text-primary" />
                  <span className="file-name">{file.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <button className="remove-file" onClick={removeFile} title="Remove file">
                    <X size={18} />
                  </button>
                </div>
              )}
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
              disabled={isProcessing || !file || !jobDescription || !companyName}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="loading-spinner" />
                  AI is Tailoring...
                </>
              ) : (
                <>
                  Generate Tailored Resume
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="glass-card right-panel">
          <h2 className="section-title">
            <Sparkles size={24} />
            How it Works
          </h2>

          <div className="steps-container">
            <div className="step">
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Data Extraction</h3>
                <p>We read your master PDF resume locally in your browser and extract your core experience, education, and skills.</p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>AI Keyword Optimization</h3>
                <p>Our advanced LLM analyzes the job description and subtly rewrites your bullet points to match the required skills and tone.</p>
              </div>
            </div>

            <div className="step">
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>PDF Generation</h3>
                <p>The tailored content is injected into a premium HTML template and converted back into a professional PDF ready for submission.</p>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
              <CheckCircle size={18} /> Privacy First
            </h4>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Your data is never stored. Your resume is processed directly using OpenAI's API securely, and no data is saved on our servers.
            </p>
          </div>
        </div>
      </main>

      {isSuccess && (
        <div className="success-overlay">
          <div className="success-card">
            <div className="success-icon-container">
              <CheckCircle size={40} />
            </div>
            <h2>Success!</h2>
            <p>Your tailored resume for <strong>{companyName}</strong> has been generated successfully. It's ready to land you that interview!</p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={resetForm}>
                Tailor Another
              </button>
              <button className="action-button" onClick={downloadPDF} style={{ marginTop: 0, width: 'auto', padding: '1rem 1.5rem' }}>
                <Download size={18} />
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
