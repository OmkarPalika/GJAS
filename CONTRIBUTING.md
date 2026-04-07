# Contributing to GJAS 🤝

We're excited that you're interested in contributing to the Global Judicial Assembly Simulator! Your contributions will help build a transparent, auditable platform for global legal collaboration using AI.

## 🎯 Getting Started

### Prerequisites
- Git installed on your machine
- Node.js v18+ and npm/yarn
- MongoDB running locally
- Mistral AI API key

### Fork the Repository

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/your-username/gjas.git
   cd gjas
   ```

3. Set up the upstream remote:
   ```bash
   git remote add upstream https://github.com/OmkarPalika/gjas.git
   ```

## 📝 Development Workflow

### 1. Create a Feature Branch

```bash
# Pull the latest changes from upstream
git pull upstream main

# Create a new feature branch
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Follow the existing code style
- Add appropriate comments and documentation
- Write tests if applicable
- Update documentation if needed

### 3. Commit Your Changes

```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "feat: add description of your changes"
```

**Commit Message Guidelines:**
- Use present tense ("Add feature" not "Added feature")
- Use imperative mood ("Fix bug" not "Fixed bug")
- Reference issues if applicable ("Fixes #123")
- Keep messages concise but descriptive

### 4. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 5. Open a Pull Request

1. Go to the [GJAS repository](https://github.com/OmkarPalika/gjas)
2. Click "New Pull Request"
3. Select your feature branch
4. Provide a clear title and description
5. Reference any related issues
6. Submit the pull request

## 📝 Code Style Guidelines

### JavaScript/TypeScript
- Use ES Modules (`import/export` syntax)
- Follow consistent indentation (2 spaces)
- Use camelCase for variables and functions
- Use PascalCase for classes and components
- Add JSDoc comments for complex functions

### React Components
- Use functional components with hooks
- Follow Next.js conventions
- Use TypeScript interfaces for props
- Keep components focused and reusable

### Documentation
- Update README.md if adding new features
- Keep docs/PROJECT.md updated with progress
- Add comments for complex logic
- Use clear, concise language

## 🧪 Testing

### Running Tests

```bash
# Run feature tests
node test_new_features.js

# Test specific components
node test_cosine.js
node check_vector_store.js
```

### Test Coverage
- Aim for comprehensive test coverage
- Test edge cases and error conditions
- Include performance benchmarks where applicable
- Document test results

## 📂 Documentation

### Updating Documentation

When adding new features or making significant changes:

1. Update `docs/IMPLEMENTATION_GUIDE.md` with technical details
2. Update `docs/PROJECT.md` with progress and features
3. Add API documentation if new endpoints are created
4. Update README.md if setup instructions change

### Documentation Standards
- Use Markdown format
- Include code examples where helpful
- Use diagrams for complex architecture
- Keep documentation up-to-date

## 🤝 Code Review Process

### What to Expect
1. Your PR will be reviewed by maintainers
2. Feedback will be provided within 3-5 business days
3. You may be asked to make revisions
4. Once approved, your PR will be merged

### Review Criteria
- Code quality and style
- Test coverage
- Documentation updates
- Performance considerations
- Security implications
- Alignment with project goals

## 🎓 Learning Resources

### Project Architecture
- Review `docs/architecture.png` for system overview
- Read `docs/IMPLEMENTATION_GUIDE.md` for technical details
- Explore the codebase to understand components

### Recommended Reading
- Next.js documentation
- Express.js documentation
- MongoDB best practices
- RAG pipeline patterns
- AI ethics and bias mitigation

## 🙏 Recognition

All contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation
- GitHub contributors list

## 📜 License

By contributing to GJAS, you agree that your contributions will be licensed under the MIT License.

## 📬 Contact

For questions about contributing:
- Open an issue on GitHub
- Join our community discussions
- Check the documentation for answers

---

Thank you for contributing to GJAS! Together we're building the future of AI-driven legal collaboration. 🚀