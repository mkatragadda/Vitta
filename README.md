# Vitta Document Chat Demo

A demo application showcasing Vitta's AI-powered document chat interface for YC application.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Features

- Upload financial documents (tax forms, bank statements, receipts)
- AI-powered chat interface to query document contents
- Mock document processing and data extraction
- Sample questions and responses

## Deployment

### Vercel (Recommended)
1. Push code to GitHub
2. Connect repository to Vercel
3. Deploy automatically

### Manual Build
```bash
npm run build
npm start
```

## Demo Instructions

1. Upload any PDF/image files (they'll be processed as mock financial documents)
2. Try sample questions:
   - "What's my total tax liability?"
   - "When are my credit card payments due?"
   - "Give me a financial summary"
3. Chat with the AI about your "documents"

## Tech Stack

- Next.js 14
- React 18
- Tailwind CSS
- Lucide React (icons)

## Note

This is a demo using mock data. Production version would integrate with:
- Real document processing (OCR, PDF parsing)
- Vector database for embeddings
- OpenAI API for RAG responses
- Secure document storage