/**
 * Tabs Component
 * 
 * Enterprise tab navigation component.
 */

import React, { useState, createContext, useContext } from 'react';
import { tokens } from '@/lib/design-tokens';

export interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: number;
  disabled?: boolean;
}

interface TabsContextValue {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined);

const useTabsContext = () => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error('Tabs components must be used within Tabs provider');
  }
  return context;
};

export interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  defaultTab,
  activeTab: controlledActiveTab,
  onTabChange,
  children,
}) => {
  const [internalActiveTab, setInternalActiveTab] = useState(defaultTab || tabs[0]?.id || '');
  const activeTab = controlledActiveTab !== undefined ? controlledActiveTab : internalActiveTab;

  const handleTabChange = (tabId: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tabId);
    }
    onTabChange?.(tabId);
  };

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab: handleTabChange }}>
      <div>
        <div
          style={{
            display: 'flex',
            gap: tokens.spacing[2],
            borderBottom: `2px solid ${tokens.colors.border.default}`,
            marginBottom: tokens.spacing[4],
            overflowX: 'auto',
            flexShrink: 0,
            ...(typeof window !== 'undefined' && window.innerWidth < 1024 ? {
              marginBottom: tokens.spacing[2],
              padding: `0 ${tokens.spacing[2]}`,
            } : {}),
          } as React.CSSProperties & { '@media (max-width: 1023px)': React.CSSProperties }}
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                disabled={tab.disabled}
                onClick={() => !tab.disabled && handleTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: tokens.spacing[2],
                  padding: `${tokens.spacing[3]} ${tokens.spacing[4]}`,
                  borderBottom: `2px solid ${isActive ? tokens.colors.primary.DEFAULT : 'transparent'}`,
                  marginBottom: '-2px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderTop: 'none',
                  borderLeft: 'none',
                  borderRight: 'none',
                  color: isActive
                    ? tokens.colors.primary.DEFAULT
                    : tab.disabled
                    ? tokens.colors.text.disabled
                    : tokens.colors.text.secondary,
                  fontWeight: isActive
                    ? tokens.typography.fontWeight.semibold
                    : tokens.typography.fontWeight.normal,
                  fontSize: tokens.typography.fontSize.base[0],
                  cursor: tab.disabled ? 'not-allowed' : 'pointer',
                  transition: `all ${tokens.transitions.duration.DEFAULT}`,
                  whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => {
                  if (!tab.disabled && !isActive) {
                    e.currentTarget.style.color = tokens.colors.text.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.color = tab.disabled
                      ? tokens.colors.text.disabled
                      : tokens.colors.text.secondary;
                  }
                }}
              >
                {tab.icon && <span>{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    style={{
                      backgroundColor: tokens.colors.error.DEFAULT,
                      color: tokens.colors.text.inverse,
                      borderRadius: tokens.borderRadius.full,
                      padding: `${tokens.spacing[1]} ${tokens.spacing[2]}`,
                      fontSize: tokens.typography.fontSize.xs[0],
                      fontWeight: tokens.typography.fontWeight.semibold,
                      minWidth: '1.25rem',
                      textAlign: 'center',
                    }}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {children}
      </div>
    </TabsContext.Provider>
  );
};

export interface TabPanelProps {
  id: string;
  children: React.ReactNode;
}

export const TabPanel: React.FC<TabPanelProps> = ({ id, children }) => {
  const { activeTab } = useTabsContext();
  if (activeTab !== id) return null;
  return <div>{children}</div>;
};

