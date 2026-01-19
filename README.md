# 📸 BestTake

**Create perfect group photos by selecting the best expressions from multiple shots.**

Inspired by Google Pixel's Best Take feature, BestTake allows you to upload multiple group photos and swap faces to ensure everyone looks their best in the final image.

![BestTake Screenshot](./docs/screenshot.png)

## ✨ Features

- **📤 Upload 2-10 group photos** - Simple drag & drop or file picker
- **🔍 AI Face Detection** - Powered by Google Gemini API
- **👥 Smart Face Grouping** - Automatically identifies the same person across photos
- **✨ Best Expression Selection** - AI suggests the best expression for each person
- **🔄 Undo/Redo** - Full history support for your edits
- **📊 Before/After Comparison** - Toggle to compare with original
- **📥 Download & Share** - Export your perfect photo or share directly

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- A Google Gemini API key ([Get one free here](https://aistudio.google.com/app/apikey))

### Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd best-take

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## 🛠️ Tech Stack

- **Framework**: Next.js 16 with React 19
- **Styling**: Tailwind CSS v4 (dark theme)
- **State Management**: Zustand
- **AI**: Google Gemini 1.5 Pro API
- **Icons**: Lucide React
- **Deployment**: Vercel (recommended)

## 📁 Project Structure

```
best-take/
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main app page
│   │   ├── layout.tsx        # Root layout
│   │   └── globals.css       # Global styles
│   ├── components/
│   │   ├── ApiKeyInput.tsx   # API key entry form
│   │   ├── PhotoUpload.tsx   # Upload interface
│   │   ├── FaceSelector.tsx  # Main face selection UI
│   │   ├── FaceThumbnail.tsx # Face thumbnail component
│   │   └── ProgressSteps.tsx # Processing indicators
│   ├── lib/
│   │   ├── gemini.ts         # Gemini API client
│   │   ├── imageUtils.ts     # Image processing
│   │   └── utils.ts          # Utilities
│   ├── store/
│   │   └── useAppStore.ts    # Zustand store
│   └── types/
│       └── index.ts          # TypeScript types
├── public/
├── package.json
└── README.md
```

## 🔐 Security & Privacy

- **API Key**: Stored locally in browser's localStorage only
- **Photos**: Never uploaded to our servers - sent directly to Gemini API
- **No Tracking**: No analytics or user tracking
- **HTTPS**: Required for production deployment

## 🎯 Usage

1. **Enter your Gemini API key** - Get one free from Google AI Studio
2. **Upload 2-10 group photos** - These should be similar shots of the same group
3. **Wait for AI analysis** - Faces are detected and grouped automatically
4. **Select best expressions** - Tap on each person to see variations
5. **Download your perfect photo** - Save or share directly

## ⚠️ Limitations

- Requires internet connection for AI processing
- Best results with clear, well-lit photos
- Maximum 10 photos per session
- Maximum 10MB per image

## 🗺️ Roadmap

- [ ] User accounts with cloud storage
- [ ] Advanced image adjustments (brightness, contrast)
- [ ] Batch processing
- [ ] Native mobile apps
- [ ] AI auto-selection mode

## 📄 License

MIT License - See [LICENSE](./LICENSE) for details.

---

Built with ❤️ using Next.js and Google Gemini
