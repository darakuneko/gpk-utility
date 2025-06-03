import React from "react"
import type { JSX } from 'react';

interface MenuItemProps {
  onClick: () => void;
  children: React.ReactNode;
  isToggle?: boolean;
  isChecked?: boolean;
}

interface LeftMenuItemProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

// Hamburger menu icon component
export const HamburgerIcon: React.FC = (): JSX.Element => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="12" x2="21" y2="12"></line>
    <line x1="3" y1="6" x2="21" y2="6"></line>
    <line x1="3" y1="18" x2="21" y2="18"></line>
  </svg>
)

// Menu item component with optional toggle support
export const MenuItem: React.FC<MenuItemProps> = ({ onClick, children, isToggle = false, isChecked = false }): JSX.Element => (
  <button
    onClick={onClick}
    className="w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center justify-between"
  >
    <span>{children}</span>
    {isToggle && (
      <div className={`w-10 h-5 rounded-full p-1 ${isChecked ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'} transition-colors duration-200 ease-in-out`}>
        <div className={`bg-white dark:bg-gray-200 w-3 h-3 rounded-full transform transition-transform duration-200 ease-in-out ${isChecked ? 'translate-x-5' : 'translate-x-0'}`}></div>
      </div>
    )}
  </button>
)

// Left menu item component
export const LeftMenuItem: React.FC<LeftMenuItemProps> = ({ active, onClick, children }): JSX.Element => (
  <button
    onClick={onClick}
    className={`w-full text-left px-4 py-3 mb-1 text-sm font-medium rounded-md transition-colors ${
      active 
        ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" 
        : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/30"
    }`}
  >
    {children}
  </button>
)