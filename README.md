# Global Judicial Assembly Simulator (GJAS) 🌍

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-black.svg)](https://nextjs.org/)

**AI-driven platform for cross-jurisdictional legal deliberation**

## 📋 Project Status

- ✅ **Phase 1: Prototype** - **COMPLETE** (100%)
- ⏳ **Phase 2: Validation** - In Planning
- 📅 **Phase 3: Paper & Open-Source** - Upcoming

## 🚀 Features

### Core Functionality
- **199 Constitutions**: Comprehensive coverage from 199 countries
- **RAG Pipeline**: Retrieval-Augmented Generation with custom cosine similarity
- **Court Hierarchy**: Weighted voting system based on court levels
- **Bias Mitigation**: Prompt engineering for neutral responses
- **Performance**: In-memory caching for faster queries

### Technical Stack
- **Backend**: Node.js, Express.js, MongoDB
- **Frontend**: Next.js 16+, React, TypeScript, Tailwind CSS
- **AI Services**: Mistral AI API for embeddings and generation
- **Data**: Custom JSON vector store with 199 documents

## 📂 Documentation

Comprehensive documentation is available:

- **[Project Overview](docs/PROJECT.md)** - Complete project details and roadmap
- **[Implementation Guide](docs/IMPLEMENTATION_GUIDE.md)** - Technical architecture and setup
- **[Phase 1 Completion Report](docs/PHASE_1_COMPLETION_REPORT.md)** - Detailed summary of Phase 1
- **[Functional Requirements](docs/FRD.md)** - All functional requirements with status
- **[System Requirements](docs/SRD.md)** - Technical specifications

## 🔧 Setup & Installation

### Prerequisites
- Node.js v18+
- MongoDB
- Mistral AI API key
- Python 3.9+ (for preprocessing scripts)

### Installation

```bash
# Clone repository
git clone https://github.com/OmkarPalika/gjas.git
cd gjas

# Install backend dependencies
cd src/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Set up environment
cp .env.example .env
# Add your Mistral API key to .env

# Start MongoDB (ensure it's running locally)

# Run preprocessing scripts
cd src/backend
node scripts/preprocessing/import_to_mongodb.js
node scripts/rag/setup_rag.js

# Start backend server (port 5000)
node index.js

# Start frontend (port 3000)
cd ../frontend
npm run dev
```

### Running the System

1. **Start MongoDB**: Ensure MongoDB is running on `mongodb://localhost:27017`
2. **Start Backend**: `cd src/backend && node index.js`
3. **Start Frontend**: `cd src/frontend && npm run dev`
4. **Access System**: Open `http://localhost:3000/rag` in your browser

## 📖 API Documentation

### RAG Endpoints

**Search Constitutional Clauses**
```bash
POST /api/rag/search
Content-Type: application/json

{
  "query": "freedom of speech"
}
```

**Generate Legal Response**
```bash
POST /api/rag/generate
Content-Type: application/json

{
  "query": "Should social media be regulated?"
}
```

### Court Hierarchy Endpoints

**Get All Court Hierarchies**
```bash
GET /api/rag/court-hierarchy
```

**Get Specific Country Hierarchy**
```bash
GET /api/rag/court-hierarchy/Afghanistan%202004
```

## 🎯 Project Goals

### Phase 1: Prototype ✅ Complete
- ✅ Data collection (199 constitutions)
- ✅ RAG pipeline implementation
- ✅ Court hierarchy system
- ✅ Bias mitigation
- ✅ Performance optimization
- ✅ Frontend integration
- ✅ Comprehensive documentation

### Phase 2: Validation ⏳ Upcoming
- Hybrid search implementation
- Multi-turn debate system
- Advanced bias detection
- User authentication
- Academic validation

### Phase 3: Paper & Open-Source 📅 Future
- Peer-reviewed paper publication
- Open-source release
- Community building
- Legal tech partnerships

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### How to Contribute
1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'Add some feature'`
4. Push to branch: `git push origin feature/your-feature`
5. Open a Pull Request

## 📜 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Constitute Project for constitutional data
- Mistral AI for embeddings and generation
- Open-source community for inspiration

## 📬 Contact

For questions or support, please open an issue on GitHub.

---

> "Building a transparent, auditable platform for global legal collaboration using AI" - GJAS Team

---

**Last Updated:** April 7, 2026
**Version:** 1.0.0
**Status:** Phase 1 Complete - Ready for Phase 2