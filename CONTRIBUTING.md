# Contributing to SkyGuard AI

Thank you for your interest in contributing to **SkyGuard AI**! We welcome contributions from researchers, data scientists, software engineers, and weather observation domain specialists.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Getting Started

1. **Fork the Repository**
   Click the **Fork** button at the top right of the [skyguard-ai repository](https://github.com/ManishX-ui/skyguard-ai).

2. **Clone your fork locally**
   ```bash
   git clone https://github.com/YOUR_GITHUB_USERNAME/skyguard-ai.git
   cd skyguard-ai
   ```

3. **Verify the environment**
   - Python: Ensure Python 3.9+ is installed (`python --version`).
   - Node.js: Ensure Node.js 18+ and npm are installed (`node --version`).

4. **Create a topic branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

---

## Development Workflow

### Python Anomaly Engine & Tests
The core anomaly engine runs strictly with Python standard library. Verify that tests pass without installing third-party dependencies:
```bash
python -m unittest discover -s tests -v
```

Run demo evaluation:
```bash
python anomaly_engine.py --demo
```

### React Dashboard (`skyguard-app/`)
To develop or build the web dashboard:
```bash
cd skyguard-app
npm install
npm run dev
```

Before committing frontend changes, ensure the build passes cleanly:
```bash
npm run build
```

---

## Submitting Pull Requests

1. Commit your changes with clear, descriptive commit messages.
2. Push your topic branch to your fork:
   ```bash
   git push origin feature/my-new-feature
   ```
3. Open a Pull Request on GitHub against the `main` branch of `skyguard-ai`.
4. Fill in the Pull Request template completely, detailing your changes, motivation, and test verification.

---

## Reporting Issues & Proposing Features

- **Bug Reports**: Please use the [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.yml) and include full reproduction steps and error logs.
- **Feature Requests**: Please use the [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.yml) and describe the problem your feature aims to solve.

---

## Guidelines for Machine Learning & Physics Rules

- Maintain standard-library compatibility for the core detection pipeline (`anomaly_engine.py`) wherever practical.
- Always include automated unit tests under `tests/` for new validation checks or anomaly rules.
- Ground physical thresholds in established meteorological standards (e.g., WMO guidelines).
