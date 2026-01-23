# 🪙 FinMate - Your AI Financial Co-Pilot

<div align="center">
  <img src="client/public/logo.png" alt="FinMate Logo" width="140" height="140" />
  
  ### **Stop reading spreadsheets. Start understanding your money.**
  
  A conversational AI assistant that transforms how small vendors manage finances—<br/>
  turning raw transactions into visual insights and confident decisions.

  <br/>

  [![ENCODE UDGAM](https://img.shields.io/badge/🏆%20ENCODE-UDGAM%202026-FFD700?style=for-the-badge)](https://encode.UDGAM.com)
  [![Thesys CI](https://img.shields.io/badge/Powered%20by-Thesys%20CI-6366F1?style=for-the-badge&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMkw0IDdWMTdMIDEyIDIyTDIwIDE3VjdMMTIgMloiIGZpbGw9IndoaXRlIi8+PC9zdmc+)](https://thesys.dev/)
  
  <br/>

  ![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react&logoColor=white)
  ![Node.js](https://img.shields.io/badge/Node.js-18+-339933?logo=node.js&logoColor=white)
  ![Tailwind](https://img.shields.io/badge/Tailwind-3.4-38B2AC?logo=tailwind-css&logoColor=white)
  ![Claude](https://img.shields.io/badge/Claude-Sonnet%204-CC785C?logo=anthropic&logoColor=white)

</div>

---

## 📺 Demo Video

> 🎬 **[Watch 2-minute Demo →](https://youtube.com/watch?v=YOUR_VIDEO_ID)**
>
> See FinMate transform a small tea vendor's confusion into clarity.

---

## 🎯 The Problem We're Solving

<table>
<tr>
<td width="50%">

### ❌ Traditional Finance Apps

```
📋 Endless transaction lists
📊 Static reports you don't understand
🤔 Manual categorization
⏰ Problems found AFTER money is gone
❓ "What does this even mean?"
```

</td>
<td width="50%">

### ✅ FinMate Experience

```
💬 "Why did I spend so much?"
📈 AI picks the right chart instantly
🔍 Automatic anomaly detection
⚡ Proactive alerts BEFORE issues
💡 "Here's what you should do..."
```

</td>
</tr>
</table>

---

## 🎪 Target Persona: Small Vendor (Tea Shop Owner)

Meet **Ramu**, a chai vendor in Delhi who earns ₹40,000/month. He has:
- 📱 UPI transactions flooding his phone
- 📦 Daily inventory purchases to track
- 🏠 Rent, utilities, and supplies to manage
- ❓ No idea if his business is actually profitable

**FinMate becomes Ramu's financial partner** — answering questions in plain Hindi/English, showing visual breakdowns, and guiding him to better decisions.

---

## ✨ Key Features

### 🧠 1. AI-Native Conversation
> *"It feels like talking to a smart accountant friend"*

- Natural language understanding ("Why did expenses spike?")
- Smart clarifications when questions are vague
- Context-aware responses that remember your situation
- Proactive insights you didn't ask for but needed

### 📊 2. Dynamic Generative UI
> *"The right chart appears at the right moment"*

| Your Question | AI Response |
|---------------|-------------|
| "Show breakdown" | 🥧 Pie chart with drill-down |
| "Compare weeks" | 📊 Bar chart comparison |
| "Show trend" | 📈 Timeline chart |
| "List transactions" | 📋 Interactive list |
| "What if I cut 20%?" | 🎚️ Simulation slider |

### 🔍 3. Intelligent Pattern Detection
> *"It catches things I would have missed"*

- **Anomaly Alerts**: "₹1,200 inventory purchase is 140% above your average"
- **Change Detection**: "Expenses up 23% vs last week"
- **Trend Analysis**: "Weekends bring 60% more revenue"

### 💡 4. Reasoning & Explainability
> *"I can see HOW it reached that conclusion"*

Every insight includes:
- **Analysis Steps**: "Looked at 15 transactions → Found pattern → Conclusion"
- **Confidence Level**: High / Medium / Low with reasoning
- **Assumptions Made**: When data is incomplete

### 🎯 5. Decision Guidance
> *"It doesn't just show data, it tells me what to DO"*

- Actionable recommendations with justification
- "What if?" scenario simulations
- Step-by-step decision guides

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          👤 USER INTERFACE                               │
│  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌──────────────┐  │
│  │ ChatWindow  │  │ ThesysGenUI  │  │   Charts    │  │  Features    │  │
│  │ (Messages)  │  │ (Renderer)   │  │ (Recharts)  │  │ (Anomaly/Sim)│  │
│  └──────┬──────┘  └──────┬───────┘  └──────┬──────┘  └──────┬───────┘  │
│         └─────────────────┴─────────────────┴─────────────────┘         │
│                                    │                                     │
│                          React + Vite + Tailwind                        │
└────────────────────────────────────┼────────────────────────────────────┘
                                     │ HTTP/REST
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│                          🖥️ EXPRESS SERVER                              │
│  ┌────────────────┐  ┌─────────────────┐  ┌────────────────────────┐  │
│  │  /api/chat     │  │ /api/transactions│  │    /api/analysis       │  │
│  │  - Sessions    │  │ - Upload CSV     │  │    - Stats             │  │
│  │  - Messages    │  │ - CRUD           │  │    - Anomalies         │  │
│  │  - AI Query    │  │ - Parse          │  │    - Comparisons       │  │
│  └───────┬────────┘  └─────────┬────────┘  └───────────┬────────────┘  │
│          └──────────────────────┴──────────────────────┘               │
│                                 │                                       │
└─────────────────────────────────┼───────────────────────────────────────┘
                                  │
        ┌─────────────────────────┴─────────────────────────┐
        ▼                                                   ▼
┌───────────────────────┐                    ┌──────────────────────────┐
│   🤖 THESYS CI API    │                    │   💾 LOCAL STORAGE       │
│  ┌─────────────────┐  │                    │  ┌────────────────────┐  │
│  │ Claude Sonnet 4 │  │                    │  │   Transactions     │  │
│  │ Generative UI   │  │                    │  │   Chat Sessions    │  │
│  │ RAG Context     │  │                    │  │   Analytics        │  │
│  └─────────────────┘  │                    │  └────────────────────┘  │
└───────────────────────┘                    └──────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology | Why We Chose It |
|-------|------------|-----------------|
| **Frontend** | React 18 + Vite | Fast HMR, modern hooks |
| **Styling** | Tailwind CSS | Rapid UI iteration |
| **Charts** | Recharts | Interactive, React-native |
| **AI Engine** | Thesys CI | Generative UI + Claude Sonnet 4 |
| **Backend** | Express.js | Lightweight, flexible |
| **Storage** | node-localstorage | Simple, no DB setup needed |
| **Data Parsing** | csv-parse | Robust CSV handling |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Thesys CI API Key ([Get free $100 credits](https://tally.so/r/QKRMrg))

### 1️⃣ Clone & Install

```bash
# Clone the repository
git clone https://github.com/yourusername/finmate.git
cd finmate

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2️⃣ Configure Environment

```bash
# In /server directory, create .env file
cd ../server
```

Create `.env` with:
```env
PORT=5000
THESYS_API_KEY=your_thesys_api_key_here
THESYS_API_URL=https://api.thesys.dev/v1/embed/chat/completions
THESYS_MODEL=c1/anthropic/claude-sonnet-4
```

### 3️⃣ Start Development Servers

**Terminal 1 - Server:**
```bash
cd server
npm run dev
# ✅ Server running on http://localhost:5000
```

**Terminal 2 - Client:**
```bash
cd client
npm run dev
# ✅ Client running on http://localhost:5173
```

### 4️⃣ Load Sample Data

1. Open `http://localhost:5173`
2. Click **"Upload Transactions"** in sidebar
3. Upload `sample-data/1-month-sample.csv`
4. Start chatting! 🎉

---

## 📁 Project Structure

```
FinMate/
├── 📂 client/                      # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── 📊 charts/          # Interactive visualizations
│   │   │   │   ├── InteractiveChart.jsx
│   │   │   │   └── ComparisonView.jsx
│   │   │   ├── 🔍 features/        # AI-powered features
│   │   │   │   ├── AnomalyCard.jsx
│   │   │   │   ├── ChangeDetection.jsx
│   │   │   │   ├── DecisionGuide.jsx
│   │   │   │   └── SimulationSlider.jsx
│   │   │   ├── 🖼️ layout/          # App structure
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── CSVUpload.jsx
│   │   │   │   └── DataManager.jsx
│   │   │   ├── 🧩 ui/              # Reusable components
│   │   │   │   ├── ClarificationOptions.jsx
│   │   │   │   ├── ConfidenceBadge.jsx
│   │   │   │   └── ReasoningSteps.jsx
│   │   │   ├── 💬 ChatWindow.jsx       # Main chat interface
│   │   │   ├── 💭 MessageBubble.jsx
│   │   │   ├── 🎨 ThesysGenUI.jsx      # Generative UI Renderer ⭐
│   │   │   └── ⚙️ ComponentRegistry.jsx # Dynamic component mapping
│   │   ├── services/
│   │   │   └── api.js              # API client
│   │   └── App.jsx
│   └── package.json
│
├── 📂 server/                      # Express Backend
│   ├── routes/
│   │   ├── chat.js                 # Chat endpoints
│   │   ├── transactions.js         # Transaction CRUD
│   │   └── analysis.js             # Analytics
│   ├── services/
│   │   ├── 🤖 llm.js               # Thesys CI integration ⭐
│   │   ├── 📝 prompts.js           # System prompts & persona
│   │   └── 💾 db.js                # Database layer
│   ├── utils/                      # Helper functions
│   ├── data/storage/               # Persisted data
│   └── package.json
│
├── 📂 sample-data/                 # Demo datasets
│   ├── 1-month-sample.csv          # Quick demo (45 txns)
│   ├── 6-month-sample.csv          # Trend analysis
│   └── 12-month-sample.csv         # Full year patterns
│
└── README.md
```

---

## 💬 Example Conversations

### Vague Query → Smart Clarification
```
👤 User: "How am I doing?"

🤖 FinMate: "I can help you understand your finances! 
            What would you like to know?"
            
            [📊 This Week's Summary]
            [📈 Compare to Last Week]  
            [🔍 Show Unusual Spending]
```

### Expense Analysis with Reasoning
```
👤 User: "Show my expenses"

🤖 FinMate: 
   ┌─────────────────────────────────────┐
   │ 🧠 My Analysis                       │
   │ ────────────────────────────────────│
   │ 1. Analyzed 15 transactions          │
   │ 2. Grouped by category               │
   │ 3. Inventory = 53% of total          │
   │ 4. Found 3 unusually high purchases  │
   │                                      │
   │ 💡 Inventory costs are your biggest  │
   │    expense driver                    │
   │                     [High Confidence]│
   └─────────────────────────────────────┘
   
   [🥧 Pie Chart: Category Breakdown]
   
   💡 Recommendation: Consider negotiating 
      bulk discounts to reduce inventory costs.
      
   [Drill into Inventory] [Compare Weeks] [Simulate Cuts]
```

### What-If Simulation
```
👤 User: "What if I cut inventory by 20%?"

🤖 FinMate:
   ┌─────────────────────────────────────┐
   │ 🎚️ Budget Simulation                │
   │ ────────────────────────────────────│
   │ Current Inventory: ₹5,200/week      │
   │ After 20% cut:     ₹4,160/week      │
   │ Monthly Savings:   ₹4,160           │
   │                                      │
   │ ⚠️ Risk: May cause stockouts on     │
   │    high-demand days (Sat-Sun)       │
   └─────────────────────────────────────┘
   
   [Try 10% instead] [Show demand patterns] [How to optimize?]
```

---

## 🔌 API Reference

### Chat
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat` | Send message, get AI response |
| `GET` | `/api/chat/sessions` | List chat sessions |
| `POST` | `/api/chat/sessions` | Create new session |
| `DELETE` | `/api/chat/sessions/:id` | Delete session |

### Transactions
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/transactions` | List transactions |
| `POST` | `/api/transactions/upload` | Upload CSV |
| `DELETE` | `/api/transactions/:id` | Delete transaction |

### Analysis
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analysis/stats` | Financial statistics |
| `GET` | `/api/analysis/anomalies` | Detected anomalies |
| `GET` | `/api/analysis/comparison` | Week comparison |

---

## 📊 Generative UI Components

FinMate dynamically generates these UI components via Thesys CI:

| Component | Triggered By | Purpose |
|-----------|--------------|---------|
| `PieChartV2` | "breakdown", "distribution" | Category analysis |
| `BarChartV2` | "compare", "vs", "difference" | Period comparison |
| `LineChartV2` | "trend", "over time", "pattern" | Timeline view |
| `ReasoningBlock` | Every response | Show AI's thinking |
| `MiniCardBlock` | Summary queries | Key metrics |
| `AnomalyCard` | Unusual patterns | Alert highlights |
| `SimulationSlider` | "what if", "simulate" | Budget scenarios |
| `DecisionGuide` | Action queries | Step-by-step help |
| `FollowUpBlock` | Every response | Drill-down options |

---

## 🏆 Hackathon Alignment

### Judging Criteria Coverage

| Criteria | Weight | Our Implementation |
|----------|--------|-------------------|
| **AI-Native Experience** | 50% | ✅ Natural language, adaptive UI, proactive insights, smart clarifications |
| **Reasoning & Explainability** | 30% | ✅ ReasoningBlock in every response, confidence indicators, assumption transparency |
| **Technical Execution** | 20% | ✅ Clean architecture, Thesys CI integration, proper error handling |

### PS.md Requirements Checklist

- [x] Gather data from sources (CSV, bank statements)
- [x] Understand natural language questions
- [x] Choose best visualization for each answer
- [x] Break confusing data into clear views
- [x] Let users zoom in, filter, explore
- [x] Adapt UI as conversation evolves
- [x] Guide from "What happened?" to "What should I do?"
- [x] Ask smart follow-up questions
- [x] Compare, simulate, explore scenarios
- [x] Surface insights, surprises, and risks
- [x] End conversations with clarity and agency

---

## 📂 Sample Data

The `sample-data/` folder contains ready-to-use datasets:

| File | Duration | Transactions | Best For |
|------|----------|--------------|----------|
| `1-month-sample.csv` | 30 days | ~45 | Quick demo |
| `6-month-sample.csv` | 180 days | ~180 | Trend analysis |
| `12-month-sample.csv` | 365 days | ~365 | Full patterns |

**CSV Format:**
```csv
date,type,amount,category,description
2026-01-15,CREDIT,1500,Sales,Morning sales
2026-01-15,DEBIT,500,Inventory,Stock purchase
```

---

## 🔐 Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | 5000 | Server port |
| `THESYS_API_KEY` | **Yes** | - | Your Thesys CI API key |
| `THESYS_API_URL` | No | `https://api.thesys.dev/...` | API endpoint |
| `THESYS_MODEL` | No | `c1/anthropic/claude-sonnet-4` | AI model |

---

## 🚧 Future Roadmap

- [ ] Bank statement PDF parsing
- [ ] SMS/Email transaction extraction
- [ ] Multi-language support (Hindi, Tamil, etc.)
- [ ] Mobile app (React Native)
- [ ] Voice input/output
- [ ] Export reports as PDF
- [ ] WhatsApp integration

---

## 👥 Team

Built with ❤️ for **ENCODE | UDGAM | Code To Innovate 2026**

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file.

---

## 🙏 Acknowledgments

- **[Thesys](https://thesys.dev/)** - Generative UI platform & credits
- **[ENCODE | UDGAM](https://encode.UDGAM.com)** - Hackathon organizers
- **[Recharts](https://recharts.org/)** - Charting library
- **[Tailwind CSS](https://tailwindcss.com/)** - Styling framework
- **[Lucide](https://lucide.dev/)** - Icon library

---

<div align="center">

### 🪙 FinMate - *Because understanding your money shouldn't require a finance degree.*

**[🎬 Watch Demo](https://youtube.com/watch?v=YOUR_VIDEO_ID)** · **[🐛 Report Bug](https://github.com/yourusername/finmate/issues)** · **[💡 Request Feature](https://github.com/yourusername/finmate/issues)**

</div>
