# Resume Refiner ✨

Resume Refiner is an automated, AI-powered application that seamlessly tailors your master resume to fit specific job descriptions. Built with React, Vite, and the OpenAI API, this tool processes PDFs locally, enhances your bullet points to match job keywords, and generates a polished, ATS-friendly PDF.

## Features

- **Local PDF Processing**: Upload a PDF and extract text right in your browser (no backend required) using `pdfjs-dist`.
- **AI-Tailored Content**: Leverages OpenAI to rewrite your experience to highlight relevant skills based on the target job description.
- **Premium Design**: A stunning, responsive interface featuring glassmorphism and modern aesthetics.
- **Instant PDF Generation**: Converts the AI's HTML output directly into a beautifully formatted PDF for download using `html2pdf.js`.

## Setup Instructions

1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your OpenAI API key:
   ```env
   VITE_OPENAI_API_KEY=your_openai_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## Architecture

1. **Frontend**: React (Vite), CSS3
2. **Icons**: Lucide React
3. **Core Libraries**: `pdfjs-dist` (Text Extraction), `html2pdf.js` (PDF Generation)
4. **AI Provider**: OpenAI API (gpt-3.5-turbo / gpt-4o-mini)
