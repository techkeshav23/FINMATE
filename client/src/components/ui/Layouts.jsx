import React from 'react';

export const Container = ({ children, className }) => (
  <div className={`space-y-3 sm:space-y-4 ${className || ''}`}>{children}</div>
);

export const Row = ({ children, className }) => (
  <div className={`flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-start ${className || ''}`}>{children}</div>
);

export const Column = ({ children, className }) => (
  <div className={`flex flex-col gap-3 sm:gap-4 flex-1 min-w-0 ${className || ''}`}>{children}</div>
);

export const DashboardGrid = ({ children }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full">{children}</div>
);
