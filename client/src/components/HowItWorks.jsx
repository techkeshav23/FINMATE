import React from 'react';
import { X, Mic, Upload, BrainCircuit, TrendingUp, ArrowRight, MessageSquare, FileText } from 'lucide-react';

const HowItWorks = ({ onClose }) => {
  const steps = [
    {
      id: 1,
      title: "Input Data",
      description: "Chat naturally or upload files",
      icon: MessageSquare,
      subIcons: [Mic, Upload, FileText],
      color: "bg-blue-50 text-blue-600 border-blue-200",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      id: 2,
      title: "AI Analysis",
      description: "FinMate processes your data",
      icon: BrainCircuit,
      color: "bg-amber-50 text-amber-600 border-amber-200",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      id: 3,
      title: "Smart Insights",
      description: "Get charts, reports & advice",
      icon: TrendingUp,
      color: "bg-emerald-50 text-emerald-600 border-emerald-200",
      gradient: "from-emerald-500 to-teal-500"
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full h-full sm:h-auto sm:rounded-2xl sm:max-w-4xl sm:max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col relative animate-scale-in">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-20">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl sm:text-3xl">🚀</span> How FinMate Works
            </h2>
            <p className="text-gray-500 text-xs sm:text-sm mt-1">Your simple guide to business growth</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 sm:w-6 sm:h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 md:p-10 flex flex-col items-center">
          
          {/* Flowchart Container */}
          <div className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-8 w-full max-w-3xl relative">
            
            {steps.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step Card */}
                <div className="relative group w-full md:w-1/3">
                  <div className={`
                    relative z-10 bg-white border-2 rounded-xl p-4 sm:p-6 flex flex-row md:flex-col items-center md:text-center gap-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1
                    ${step.color}
                  `}>
                    
                    {/* Icon Circle */}
                    <div className={`
                      w-12 h-12 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-white shadow-md flex-shrink-0
                      bg-gradient-to-br ${step.gradient}
                    `}>
                      <step.icon className="w-6 h-6 sm:w-8 sm:h-8" />
                    </div>

                    {/* Text */}
                    <div className="flex-1 md:w-full text-left md:text-center">
                      <h3 className="font-bold text-gray-800 text-base sm:text-lg mb-0.5 sm:mb-1">{step.title}</h3>
                      <p className="text-xs sm:text-sm text-gray-600 font-medium">{step.description}</p>
                      
                      {/* Sub Icons (Mobile: Inline / Desktop: Below) */}
                      {step.subIcons && (
                        <div className="flex gap-2 mt-2 md:justify-center">
                          {step.subIcons.map((Icon, i) => (
                            <div key={i} className="p-1 bg-white rounded-full shadow-sm border border-gray-100">
                              <Icon className="w-3 h-3 opacity-70" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Arrow (Desktop) */}
                {index < steps.length - 1 && (
                  <div className="hidden md:flex flex-col items-center justify-center text-gray-300">
                    <ArrowRight className="w-8 h-8 animate-pulse" />
                  </div>
                )}
                
                {/* Arrow (Mobile - Vertical Arrow) */}
                {index < steps.length - 1 && (
                  <div className="md:hidden flex justify-center py-2">
                    <ArrowRight className="w-6 h-6 rotate-90 text-black/80" />
                  </div>
                )}
              </React.Fragment>
            ))}

          </div>

          {/* Bottom Section - Value Prop */}
          <div className="mt-8 sm:mt-12 w-full bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-5 sm:p-6 md:p-8 border border-amber-100 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex-1">
              <h3 className="text-xl font-bold text-amber-900 mb-2">Why use FinMate?</h3>
              <ul className="space-y-2">
                {[
                  "Save 2+ hours daily on manual calculations",
                  "Understand your most profitable items",
                  "Never lose track of customer credit"
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-amber-800">
                    <div className="w-5 h-5 rounded-full bg-amber-200 flex items-center justify-center text-amber-700 text-xs font-bold">✓</div>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            
            <button 
              onClick={onClose}
              className="w-full md:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold py-3 px-8 rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-105 active:scale-95 whitespace-nowrap"
            >
              Get Started
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
