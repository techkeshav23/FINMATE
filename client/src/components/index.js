/**
 * FinMate Components - Small Vendor Persona
 * 
 * This file provides a central export point for all components.
 * Components are organized into:
 * 
 * - ui/         : Generic UI elements (badges, reasoning, clarifications)
 * - charts/     : Data visualization (bar, pie, timeline, comparison)
 * - features/   : Business logic components (anomalies, decisions, simulations)
 * - layout/     : Structural components (sidebar, modals)
 */

// UI Components
export { ConfidenceBadge, ReasoningSteps, ClarificationOptions } from './ui';

// Chart Components
export { InteractiveBarChart, InteractivePieChart, InteractiveTimelineChart, ComparisonView } from './charts';

// Feature Components
export { 
  AnomalyCard, 
  ChangeDetection, 
  DecisionGuide, 
  SimulationSlider 
} from './features';

// Layout Components
export { Sidebar, CSVUpload } from './layout';

// Direct component exports
export { default as MessageBubble } from './MessageBubble';
export { default as ChatWindow } from './ChatWindow';
export { default as ThesysGenUI } from './ThesysGenUI';
