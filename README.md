# FinMate - Smart Roommate Expense Manager 💰

An AI-native financial co-pilot for roommates, built for the **ENCODE | UDGIAM | Code To Innovate** hackathon. Features conversational UI, **TRUE runtime Generative UI via Thesys CI**, intelligent financial insights, and advanced financial analysis.

**Target Persona**: Roommates splitting expenses (FairShare)

## ⚡ Key Differentiator: True GenUI

Unlike apps that select from pre-built components, **FinMate uses Thesys CI to generate UI specifications at runtime**:

```
User Query → AI Analyzes Data → Thesys Generates UI Spec → React Renders Dynamic Components
```

- **Not template selection** - The AI generates the exact chart data, metrics, and layout needed
- **Truly adaptive** - Each response creates unique UI tailored to the specific question
- **Runtime generation** - Components are specified by AI, rendered by React at runtime

See [ThesysGenUI.jsx](client/src/components/ThesysGenUI.jsx) and [thesysGenUI.js](server/services/thesysGenUI.js) for implementation.

## 🌟 Features

### Core Features
- **AI-Native Experience**: Conversational interface powered by Thesys GenUI / Gemini
- **Runtime GenUI**: Dynamic charts, metrics, lists, and flows generated at runtime (not pre-built)
- **Smart Settlement**: Splitwise-style debt calculation (Who owes whom?)
- **Simulation Mode**: "What-if" scenarios (rent increase, new roommate, etc.)
- **Mobile Responsive**: Works on all devices

### Advanced Features
- **Multi-Source Data Import**: Import from bank statements (CSV), SMS alerts, and email notifications
- **Proactive Insights**: AI detects anomalies and suggests actions automatically
- **Anomaly Detection**: Automatically identifies unusual spending patterns with severity levels
- **Period Comparison**: Side-by-side comparison of spending across different time periods
- **Decision Guidance**: Interactive step-by-step guides for financial decisions
- **Chain-of-Thought Reasoning**: See how AI arrived at conclusions
- **Honest Uncertainty**: Every AI response shows confidence score with reasons and assumptions
- **Calculation Breakdown**: See the math behind every calculation
- **Persistent Memory**: Conversation context and learned patterns saved across sessions

### Data Import
- **CSV Upload**: Import transaction data from CSV files
- **Bank Statement Parser**: Parse HDFC, ICICI, SBI, Axis, and other bank statement formats (8 banks supported)
- **SMS Parser**: Extract transaction data from bank SMS alerts
- **Learning System**: Parser improves from corrections over time

## 🏗️ Project Structure

```
FinMate/
├── client/                 # React Frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatWindow.jsx        # Main chat interface
│   │   │   ├── MessageBubble.jsx     # Chat message + confidence display
│   │   │   ├── Sidebar.jsx           # Navigation + Financial Summary
│   │   │   ├── DynamicComponentRenderer.jsx  # Generative UI Engine
│   │   │   ├── ThesysGenUI.jsx       # ⚡ Runtime GenUI Renderer
│   │   │   ├── InteractiveChart.jsx  # Drill-down enabled charts
│   │   │   ├── SimulationSlider.jsx  # What-if scenarios with sliders
│   │   │   ├── ReasoningSteps.jsx    # Chain-of-thought display
│   │   │   ├── ChangeDetection.jsx   # Proactive change alerts
│   │   │   ├── ComparisonView.jsx    # Period comparison charts
│   │   │   ├── AnomalyCard.jsx       # Anomaly detection display
│   │   │   └── DecisionGuide.jsx     # Guided decision flow
│   │   ├── services/
│   │   │   └── api.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
│
├── server/                 # Node.js Backend
│   ├── config/
│   │   └── systemPrompt.js  # AI personality & instructions
│   ├── data/
│   │   └── transactions.json  # Mock financial data
│   ├── routes/
│   │   └── chat.js          # Chat logic + local fallback
│   ├── services/
│   │   ├── thesysGenUI.js   # ⚡ Thesys GenUI Integration (runtime generation)
│   │   ├── thesys.js        # Legacy Thesys API
│   │   ├── nlpEngine.js     # Intent detection + clarification
│   │   ├── patternLearning.js  # Learns user spending patterns
│   │   ├── conversationMemory.js  # Persistent conversation context
│   │   ├── pdfParser.js     # Bank statement parser (8 banks)
│   │   └── statementParser.js  # Bank statement & SMS parser
│   ├── server.js
│   ├── package.json
│   └── .env.example
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn
- API Keys (Thesys and/or Gemini)

### Installation

1. **Clone and navigate to the project:**
   ```bash
   cd FinMate
   ```

2. **Install server dependencies:**
   ```bash
   cd server
   npm install
   ```

3. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env and add your API keys
   ```

4. **Install client dependencies:**
   ```bash
   cd ../client
   npm install
   ```

### Running the Application

1. **Start the backend server (Terminal 1):**
   ```bash
   cd server
   npm run dev
   ```
   Server runs on http://localhost:5000

2. **Start the frontend (Terminal 2):**
   ```bash
   cd client
   npm run dev
   ```
   Client runs on http://localhost:3000

3. **Open your browser** and go to http://localhost:3000

## 💬 Sample Queries

Try these prompts in the chat:

### Analysis
- "Who spent the most this month?"
- "Show me unpaid bills"
- "Break down spending by category"
- "Who owes money to whom?"
- "Show spending timeline"
- "Show all food transactions"

### Advanced Analysis
- "Detect anomalies in spending"
- "Compare this month vs last month"
- "What should I do next?" (Decision guidance)
- "Show calculation breakdown" (Step-by-step math)

### Simulations (What-If)
- "What if rent increases by 15%?"
- "What if we add a 4th roommate?"
- "What if Amit moves out?"
- "Plan next month's budget"

## 🎨 UI Components (Generative UI)

The app dynamically renders these components based on AI responses:

| Component | Trigger | Use Case |
|-----------|---------|----------|
| **Bar Chart** | Spending comparisons | Who paid most? Rent vs projected |
| **Pie Chart** | Category breakdown | Where is money going? |
| **Line Chart**| Trend analysis | Spending over time (Timeline) |
| **Transaction Table** | Bill listings | Pending bills, mark as paid, Filtered views |
| **Settlement Card** | Debt calculations | Who owes whom, balances |
| **Comparison View** | Period analysis | This month vs last month |
| **Anomaly Card** | Unusual spending | Detected spending anomalies |
| **Decision Guide** | Next steps | Interactive action guides |

## 🔧 API Configuration

### Thesys GenUI (Primary)
Request $100 free credits: https://tally.so/r/QKRMrg

```env
THESYS_API_KEY=your_thesys_key
THESYS_API_URL=https://api.thesys.dev/v1/generate
THESYS_MODEL=thesys-genui-1
```

### Google Gemini (Fallback)
Get API key: https://ai.google.dev/

```env
GEMINI_API_KEY=your_gemini_key
```

The system automatically falls back: **Thesys → Gemini → Local Rules**

## 📊 Mock Data

The app includes sample transaction data for 3 roommates:
- **Rahul** - Pays most utilities
- **Priya** - Handles groceries
- **Amit** - Entertainment & subscriptions

Categories: Rent, Utilities, Groceries, Food, Entertainment, Household

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Recharts, Lucide Icons
- **Backend**: Node.js, Express
- **AI**: Thesys GenUI (primary), Google Gemini (fallback)
- **API**: RESTful endpoints for chat and transactions

## 📝 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/chat` | Send a message |
| GET | `/api/chat/history` | Get chat history |
| DELETE | `/api/chat/history` | Clear history |
| GET | `/api/chat/proactive` | Get proactive insights |
| GET | `/api/transactions` | Get all transactions |
| POST | `/api/transactions/upload` | Upload CSV transactions |
| PATCH | `/api/transactions/:id` | Update transaction status |
| POST | `/api/transactions/parse-statement` | Parse bank statement file |
| POST | `/api/transactions/parse-text` | Parse SMS/email text |
| POST | `/api/transactions/confirm-import` | Confirm and import parsed transactions |
| GET | `/api/transactions/anomalies` | Detect spending anomalies |
| GET | `/api/health` | Health check |

## 🎯 Judging Criteria Alignment

| Criteria | Implementation |
|----------|----------------|
| **AI-Native Experience (50%)** | ✅ Conversational UI, intent inference, dynamic Generative UI with Thesys, proactive insights with anomaly detection, confidence levels on responses |
| **Reasoning & Explainability (30%)** | ✅ Detailed insights, debt math with calculation breakdown, simulation comparisons, period comparison view, decision guides |
| **Technical Execution (20%)** | ✅ Clean architecture, smart fallback chain (Thesys→Gemini→Local), multi-source data import, interactive components, localStorage persistence |

## 🆕 Recent Enhancements

### v2.0 Features
- **🔍 Anomaly Detection**: Automatically identifies unusual spending patterns
- **📊 Period Comparison**: Compare spending across different time periods
- **🎯 Decision Guidance**: Step-by-step guides for financial decisions  
- **🛡️ Confidence Levels**: See AI confidence (High/Medium/Low) on every response
- **📱 Multi-Source Import**: Import from bank CSV, SMS alerts, email notifications
- **🧮 Calculation Breakdown**: See step-by-step math behind calculations
- **💾 Persistent Memory**: Chat history saved across browser sessions

## 🤝 Contributing

Feel free to submit issues and pull requests!

## 📄 License

MIT License - feel free to use for your hackathon!

---

Built with ❤️ for **ENCODE | UDGIAM | Code To Innovate** Hackathon
