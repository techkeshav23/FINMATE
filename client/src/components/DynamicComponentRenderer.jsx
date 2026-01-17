import { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
  CartesianGrid
} from 'recharts';
import { 
  Check, 
  ArrowRight, 
  Calendar, 
  IndianRupee,
  TrendingUp,
  Users,
  Square,
  CheckSquare,
  HelpCircle,
  ChevronDown,
  ZoomIn,
  Sparkles
} from 'lucide-react';
import { transactionsAPI } from '../services/api';
import ComparisonView from './ComparisonView';
import AnomalyCard from './AnomalyCard';
import DecisionGuide from './DecisionGuide';
import ClarificationOptions from './ClarificationOptions';
import SettlementConfirmation from './SettlementConfirmation';
import SettlementSuccess from './SettlementSuccess';
import SimulationSlider from './SimulationSlider';
import ChangeDetection from './ChangeDetection';
import ReasoningSteps from './ReasoningSteps';
import ThesysGenUI from './ThesysGenUI';

// Color palette for charts
const COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// Timeline/Trend Chart Component with drill-down
const TimelineChart = ({ data, title, onDrillDown }) => {
  const [selectedDate, setSelectedDate] = useState(null);

  const handlePointClick = (point) => {
    if (point && point.activePayload && point.activePayload[0]) {
      const clickedData = point.activePayload[0].payload;
      setSelectedDate(clickedData.date);
      if (onDrillDown) {
        const formattedDate = new Date(clickedData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long' });
        onDrillDown(`Show transactions from ${formattedDate}`);
      }
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary-400" />
          {title || 'Spending Trend'}
        </h3>
        <div className="flex items-center gap-1 text-xs text-dark-500">
          <ZoomIn className="w-3 h-3" />
          <span>Click to explore</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart 
          data={data.data} 
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          onClick={handlePointClick}
          style={{ cursor: 'pointer' }}
        >
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
            formatter={(value) => [`₹${value.toLocaleString()}`, 'Spent']}
            labelFormatter={(value) => new Date(value).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          />
          <Line 
            type="monotone" 
            dataKey="amount" 
            stroke="#3b82f6" 
            strokeWidth={3}
            dot={{ fill: '#3b82f6', r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// Bar Chart Component with drill-down
const SpendingBarChart = ({ data, title, onDrillDown }) => {
  const [selectedBar, setSelectedBar] = useState(null);

  const handleBarClick = (entry) => {
    if (entry && entry.activePayload && entry.activePayload[0]) {
      const clickedData = entry.activePayload[0].payload;
      setSelectedBar(clickedData.name);
      if (onDrillDown) {
        onDrillDown(`Show me all ${clickedData.name}'s transactions`);
      }
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-400" />
          {title || 'Spending Breakdown'}
        </h3>
        <div className="flex items-center gap-1 text-xs text-dark-500">
          <ZoomIn className="w-3 h-3" />
          <span>Click to drill down</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart 
          data={data.data} 
          margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          onClick={handleBarClick}
          style={{ cursor: 'pointer' }}
        >
          <XAxis 
            dataKey="name" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
          />
          <YAxis 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => `₹${(value/1000).toFixed(0)}k`}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
            formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
          />
          <Bar 
            dataKey="amount" 
            fill="#22c55e" 
            radius={[4, 4, 0, 0]}
          >
            {data.data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`}
                fill={selectedBar === entry.name ? '#3b82f6' : '#22c55e'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="mt-4 pt-4 border-t border-dark-700 flex items-center justify-between text-sm">
        <span className="text-dark-400">Total Expenses</span>
        <span className="text-white font-semibold">₹{data.total?.toLocaleString()}</span>
      </div>
    </div>
  );
};

// Pie Chart Component with drill-down
const CategoryPieChart = ({ data, title, onDrillDown }) => {
  const [selectedCategory, setSelectedCategory] = useState(null);

  const handlePieClick = (entry, index) => {
    if (entry) {
      const category = entry.category || entry.name;
      setSelectedCategory(category);
      if (onDrillDown) {
        onDrillDown(`Show me all ${category} transactions`);
      }
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-primary-400" />
          {title || 'Category Distribution'}
        </h3>
        <div className="flex items-center gap-1 text-xs text-dark-500">
          <ZoomIn className="w-3 h-3" />
          <span>Click to explore</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data.data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="amount"
            nameKey="category"
            onClick={handlePieClick}
            style={{ cursor: 'pointer' }}
          >
            {data.data.map((entry, index) => (
              <Cell 
                key={`cell-${index}`} 
                fill={COLORS[index % COLORS.length]}
                stroke="transparent"
              />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              color: '#f1f5f9'
            }}
            formatter={(value) => [`₹${value.toLocaleString()}`, 'Amount']}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="grid grid-cols-2 gap-2 mt-4">
        {data.data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-dark-400">{item.category}</span>
            <span className="text-dark-300 ml-auto">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// Transaction Table Component
const TransactionTable = ({ data }) => {
  const [transactions, setTransactions] = useState(data.transactions);
  const [updatingId, setUpdatingId] = useState(null);

  const handleToggleSettle = async (id, currentStatus) => {
    setUpdatingId(id);
    try {
      const newStatus = !currentStatus;
      await transactionsAPI.updateStatus(id, newStatus);
      
      setTransactions(prev => prev.map(txn => 
        txn.id === id ? { ...txn, settled: newStatus } : txn
      ));
    } catch (error) {
      console.error('Failed to update transaction:', error);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
      <div className="p-4 border-b border-dark-700">
        <h3 className="text-sm font-medium text-dark-300 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary-400" />
          {data.title || 'Transactions'}
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-dark-900/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-dark-400 uppercase tracking-wider">Payer</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-dark-400 uppercase tracking-wider">Amount</th>
              <th className="px-4 py-3 text-center text-xs font-medium text-dark-400 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-700">
            {transactions.map((txn, index) => (
              <tr key={txn.id || index} className="hover:bg-dark-700/30 transition-colors">
                <td className="px-4 py-3 text-dark-300 whitespace-nowrap">
                  {new Date(txn.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                </td>
                <td className="px-4 py-3 text-white">{txn.description}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-1 text-xs rounded-full bg-dark-700 text-dark-300">
                    {txn.payer}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-white font-medium">
                  ₹{txn.amount.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-center">
                  <button 
                    onClick={() => handleToggleSettle(txn.id, txn.settled)}
                    disabled={updatingId === txn.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full transition-colors cursor-pointer ${
                      updatingId === txn.id ? 'opacity-50 cursor-not-allowed' : ''
                    } ${
                      txn.settled 
                        ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30' 
                        : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30'
                    }`}
                  >
                    {txn.settled ? (
                      <>
                        <CheckSquare className="w-3 h-3" /> Paid
                      </>
                    ) : (
                      <>
                        <Square className="w-3 h-3" /> Pending
                      </>
                    )}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="p-4 border-t border-dark-700 flex items-center justify-between">
        <span className="text-sm text-dark-400">{transactions.length} transactions</span>
        <span className="text-sm text-white font-medium">Total: ₹{transactions.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}</span>
      </div>
    </div>
  );
};

// Settlement Card Component
const SettlementCard = ({ data }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
      <h3 className="text-sm font-medium text-dark-300 mb-4 flex items-center gap-2">
        <Users className="w-4 h-4 text-primary-400" />
        Settlement Summary
      </h3>
      
      {data.settlements.length > 0 ? (
        <div className="space-y-3">
          {data.settlements.map((settlement, index) => (
            <div 
              key={index}
              className="flex items-center justify-between p-3 bg-dark-900/50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-red-400">
                    {settlement.from.charAt(0)}
                  </span>
                </div>
                <ArrowRight className="w-4 h-4 text-dark-500" />
                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary-400">
                    {settlement.to.charAt(0)}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-semibold">₹{settlement.amount.toLocaleString()}</div>
                <div className="text-xs text-dark-400">
                  {settlement.from} → {settlement.to}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <Check className="w-12 h-12 text-primary-500 mx-auto mb-2" />
          <p className="text-dark-300">Everyone is settled up!</p>
        </div>
      )}

      {/* Balance Overview */}
      <div className="mt-4 pt-4 border-t border-dark-700">
        <h4 className="text-xs font-medium text-dark-400 mb-3">Current Balances</h4>
        <div className="space-y-2">
          {data.balances.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-dark-300">{item.name}</span>
              <span className={`text-sm font-medium ${
                item.balance > 0 
                  ? 'text-primary-400' 
                  : item.balance < 0 
                    ? 'text-red-400' 
                    : 'text-dark-400'
              }`}>
                {item.balance > 0 ? '+' : ''}₹{item.balance.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Expandable Calculation Breakdown */}
      <div className="mt-4 pt-4 border-t border-dark-700">
        <button
          onClick={() => setShowBreakdown(!showBreakdown)}
          className="flex items-center justify-between w-full text-left"
        >
          <span className="text-xs font-medium text-dark-400 flex items-center gap-1">
            <HelpCircle className="w-3 h-3" />
            How was this calculated?
          </span>
          <ChevronDown className={`w-4 h-4 text-dark-500 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
        </button>
        
        {showBreakdown && (
          <div className="mt-3 p-3 bg-dark-900/70 rounded-lg text-xs space-y-3 animate-fade-in">
            <div>
              <p className="text-dark-400 font-medium mb-1">📐 Calculation Method:</p>
              <p className="text-dark-500">Using Splitwise-style debt simplification algorithm</p>
            </div>
            
            <div>
              <p className="text-dark-400 font-medium mb-1">📊 How Balances Work:</p>
              <ul className="text-dark-500 space-y-1 ml-2">
                <li>• <span className="text-primary-400">Positive (+)</span> = Person is owed money (paid more than their share)</li>
                <li>• <span className="text-red-400">Negative (-)</span> = Person owes money (paid less than their share)</li>
                <li>• Zero = Person has paid exactly their fair share</li>
              </ul>
            </div>
            
            <div>
              <p className="text-dark-400 font-medium mb-1">🔢 Step-by-Step:</p>
              <ol className="text-dark-500 space-y-1 ml-2 list-decimal list-inside">
                <li>Sum what each person <span className="text-primary-400">paid</span> for others</li>
                <li>Subtract what each person <span className="text-red-400">owes</span> from splits</li>
                <li>Net balance = Total Paid - Total Owed</li>
                <li>Match people with negative balances to those with positive</li>
              </ol>
            </div>

            <div className="pt-2 border-t border-dark-700">
              <p className="text-dark-400 font-medium mb-1">💡 Example:</p>
              <p className="text-dark-500">
                If Rahul pays ₹3000 for rent split 3 ways:<br/>
                • Rahul: +3000 (paid) - 1000 (his share) = <span className="text-primary-400">+2000</span><br/>
                • Priya: +0 - 1000 = <span className="text-red-400">-1000</span> (owes Rahul)<br/>
                • Amit: +0 - 1000 = <span className="text-red-400">-1000</span> (owes Rahul)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Dynamic Component Renderer
const DynamicComponentRenderer = ({ componentType, data, onAction, onDrillDown }) => {
  if (!componentType || !data) return null;

  switch (componentType) {
    // ⚡ THESYS GENUI - Runtime generated UI (key differentiator!)
    case 'thesys_genui':
      return (
        <div className="thesys-genui-wrapper">
          {/* Source indicator for judges */}
          {data.source && (
            <div className="mb-2 flex items-center gap-1.5 text-xs text-primary-400/70">
              <Sparkles className="w-3 h-3" />
              <span>Dynamically generated UI</span>
            </div>
          )}
          <ThesysGenUI 
            generatedUI={data.generated_ui} 
            onAction={onAction} 
            onDrillDown={onDrillDown} 
          />
        </div>
      );
    case 'bar_chart':
      return <SpendingBarChart data={data} title={data.title} onDrillDown={onDrillDown} />;
    case 'pie_chart':
      return <CategoryPieChart data={data} title={data.title} onDrillDown={onDrillDown} />;
    case 'line_chart':
      return <TimelineChart data={data} title={data.title} onDrillDown={onDrillDown} />;
    case 'transaction_table':
      return <TransactionTable data={data} />;
    case 'settlement_card':
      return <SettlementCard data={data} />;
    case 'settlement_confirmation':
      return <SettlementConfirmation data={data} onAction={onAction} />;
    case 'settlement_success':
      return <SettlementSuccess data={data} />;
    case 'comparison_view':
      return <ComparisonView data={data} />;
    case 'anomaly_card':
      return <AnomalyCard data={data} onExplore={onDrillDown} />;
    case 'decision_guide':
      return <DecisionGuide data={data} onAction={onAction} />;
    case 'clarification_options':
      return <ClarificationOptions data={data} onAction={onAction} />;
    case 'simulation_slider':
      return <SimulationSlider data={data} onSimulate={onAction} />;
    case 'change_detection':
      return <ChangeDetection changes={data.changes} onExplore={onDrillDown} />;
    case 'reasoning_steps':
      return <ReasoningSteps reasoning={data} />;
    default:
      console.warn(`Unknown component type: ${componentType}`);
      return (
        <div className="bg-dark-800 rounded-xl p-4 border border-dark-700">
          <p className="text-dark-400 text-sm">
            Component type "{componentType}" is not yet implemented.
          </p>
          <pre className="mt-2 text-xs text-dark-500 overflow-auto">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      );
  }
};

export default DynamicComponentRenderer;
