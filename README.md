# ContextFinder.ai

> A contextually aware Chrome extension that summarizes academic PDFs and lets you ask questions about them — instantly.

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white)
![Chrome Extension](https://img.shields.io/badge/Chrome_Extension-4285F4?style=flat&logo=google-chrome&logoColor=white)

---

## What It Does

Drop a PDF into ContextFinder.ai and immediately:

- Get a concise, structured **summary** of the paper
- **Ask questions** in natural language and get grounded answers
- Skip the wall-of-text and get to the point

Built for students and researchers who don't have time to read a 40-page paper before their 8am class.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Extension UI | React + TypeScript |
| Background logic | Node.js |
| Build tooling | Webpack |
| Styling | CSS Modules |
| PDF parsing | (in `scripts/`) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Google Chrome

### Install & Build

```bash
git clone https://github.com/MaxIngram05/ContextFinder.ai.git
cd ContextFinder.ai
npm install
npm run build
```

### Load into Chrome

1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right)
3. Click **Load unpacked**
4. Select the `dist/` folder

---

## Project Structure

```
ContextFinder.ai/
├── public/          # Static assets & manifest.json
├── scripts/         # PDF parsing utilities
├── src/             # React + TS source
├── index.html       # Extension entry
├── webpack.config.js
└── tsconfig.json
```

---

## Roadmap

- [ ] Multi-PDF session support
- [ ] Citation extraction
- [ ] Export summaries to Markdown
- [ ] Firefox support

---

## Contributing

PRs welcome. Open an issue first for major changes.

---

## License

MIT

---

---
