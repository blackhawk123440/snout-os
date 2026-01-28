/**
 * Zustand store for Automation Builder draft state
 */

import { create } from 'zustand';
import type { AutomationBuilder, TriggerConfig, Condition, ConditionGroup, Action, Templates } from '@snoutos/shared/automation-schemas';

interface AutomationBuilderState {
  // Draft data
  name: string;
  description: string;
  lane: 'front_desk' | 'sitter' | 'billing' | 'system' | '';
  trigger: TriggerConfig | null;
  conditions: ConditionGroup[];
  actions: Action[];
  templates: Templates;

  // UI state
  currentStep: number;
  automationId: string | null; // null for new, set for edit

  // Actions
  setName: (name: string) => void;
  setDescription: (description: string) => void;
  setLane: (lane: 'front_desk' | 'sitter' | 'billing' | 'system') => void;
  setTrigger: (trigger: TriggerConfig) => void;
  setConditions: (conditions: ConditionGroup[]) => void;
  addConditionGroup: () => void;
  addConditionToGroup: (groupIndex: number, condition: Condition) => void;
  removeConditionFromGroup: (groupIndex: number, conditionIndex: number) => void;
  updateConditionInGroup: (groupIndex: number, conditionIndex: number, condition: Condition) => void;
  setActions: (actions: Action[]) => void;
  addAction: (action: Action) => void;
  removeAction: (index: number) => void;
  reorderAction: (fromIndex: number, toIndex: number) => void;
  setTemplates: (templates: Templates) => void;
  setTemplate: (key: string, value: string) => void;
  removeTemplate: (key: string) => void;
  setCurrentStep: (step: number) => void;
  setAutomationId: (id: string | null) => void;
  reset: () => void;
  loadAutomation: (automation: any) => void;
}

const initialState = {
  name: '',
  description: '',
  lane: '' as const,
  trigger: null,
  conditions: [],
  actions: [],
  templates: {},
  currentStep: 1,
  automationId: null,
};

export const useAutomationBuilderStore = create<AutomationBuilderState>((set) => ({
  ...initialState,

  setName: (name) => set({ name }),
  setDescription: (description) => set({ description }),
  setLane: (lane) => set({ lane }),
  setTrigger: (trigger) => set({ trigger }),
  setConditions: (conditions) => set({ conditions }),
  addConditionGroup: () =>
    set((state) => ({
      conditions: [...state.conditions, { operator: 'AND', conditions: [] }],
    })),
  addConditionToGroup: (groupIndex, condition) =>
    set((state) => {
      const newConditions = [...state.conditions];
      newConditions[groupIndex] = {
        ...newConditions[groupIndex],
        conditions: [...newConditions[groupIndex].conditions, condition],
      };
      return { conditions: newConditions };
    }),
  removeConditionFromGroup: (groupIndex, conditionIndex) =>
    set((state) => {
      const newConditions = [...state.conditions];
      newConditions[groupIndex] = {
        ...newConditions[groupIndex],
        conditions: newConditions[groupIndex].conditions.filter((_, i) => i !== conditionIndex),
      };
      return { conditions: newConditions };
    }),
  updateConditionInGroup: (groupIndex, conditionIndex, condition) =>
    set((state) => {
      const newConditions = [...state.conditions];
      newConditions[groupIndex] = {
        ...newConditions[groupIndex],
        conditions: newConditions[groupIndex].conditions.map((c, i) =>
          i === conditionIndex ? condition : c,
        ),
      };
      return { conditions: newConditions };
    }),
  setActions: (actions) => set({ actions }),
  addAction: (action) => set((state) => ({ actions: [...state.actions, action] })),
  removeAction: (index) =>
    set((state) => ({ actions: state.actions.filter((_, i) => i !== index) })),
  reorderAction: (fromIndex, toIndex) =>
    set((state) => {
      const newActions = [...state.actions];
      const [removed] = newActions.splice(fromIndex, 1);
      newActions.splice(toIndex, 0, removed);
      return { actions: newActions };
    }),
  setTemplates: (templates) => set({ templates }),
  setTemplate: (key, value) =>
    set((state) => ({ templates: { ...state.templates, [key]: value } })),
  removeTemplate: (key) =>
    set((state) => {
      const { [key]: removed, ...rest } = state.templates;
      return { templates: rest };
    }),
  setCurrentStep: (step) => set({ currentStep: step }),
  setAutomationId: (id) => set({ automationId: id }),
  reset: () => set(initialState),
  loadAutomation: (automation) =>
    set({
      name: automation.name || '',
      description: automation.description || '',
      lane: automation.lane || '',
      trigger: automation.trigger || null,
      conditions: Array.isArray(automation.conditions?.groups)
        ? automation.conditions.groups
        : automation.conditions?.conditions
          ? [{ operator: 'AND' as const, conditions: automation.conditions.conditions }]
          : [],
      actions: Array.isArray(automation.actions) ? automation.actions : [],
      templates: automation.templates || {},
      automationId: automation.id || null,
    }),
}));
