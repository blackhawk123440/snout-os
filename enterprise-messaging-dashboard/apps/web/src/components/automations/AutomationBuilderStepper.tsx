'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAutomationBuilderStore } from '@/lib/store/automation-builder-store';
import {
  useCreateAutomation,
  useUpdateAutomation,
  useTestAutomation,
  useActivateAutomation,
} from '@/lib/api/automations-hooks';
import {
  automationBuilderSchema,
  triggerTypeSchema,
  conditionOperatorSchema,
  describeTrigger,
  describeCondition,
  describeAction,
  type TriggerConfig,
  type Condition,
  type Action,
} from '@snoutos/shared/automation-schemas';
import { z } from 'zod';

const STEPS = [
  { number: 1, title: 'Basic Info' },
  { number: 2, title: 'Trigger' },
  { number: 3, title: 'Conditions' },
  { number: 4, title: 'Actions' },
  { number: 5, title: 'Templates' },
  { number: 6, title: 'Review & Test' },
];

export function AutomationBuilderStepper() {
  const router = useRouter();
  const [testResults, setTestResults] = useState<any>(null);
  const [testContext, setTestContext] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const {
    name,
    description,
    lane,
    trigger,
    conditions,
    actions,
    templates,
    currentStep,
    automationId,
    setName,
    setDescription,
    setLane,
    setTrigger,
    setConditions,
    addConditionGroup,
    addConditionToGroup,
    removeConditionFromGroup,
    updateConditionInGroup,
    addAction,
    removeAction,
    reorderAction,
    setTemplate,
    removeTemplate,
    setCurrentStep,
  } = useAutomationBuilderStore();

  const createAutomation = useCreateAutomation();
  const updateAutomation = useUpdateAutomation();
  const testAutomation = useTestAutomation();
  const activateAutomation = useActivateAutomation();

  // Autosave draft every 5 seconds
  useEffect(() => {
    if (currentStep > 1 && name && lane) {
      const timer = setTimeout(() => {
        saveDraft();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [name, description, lane, trigger, conditions, actions, templates, currentStep]);

  const validateStep = (step: number): boolean => {
    setErrors({});

    try {
      switch (step) {
        case 1:
          if (!name || !lane) {
            setErrors({ step1: 'Name and lane are required' });
            return false;
          }
          return true;
        case 2:
          if (!trigger) {
            setErrors({ step2: 'Trigger is required' });
            return false;
          }
          return true;
        case 3:
          // Conditions are optional
          return true;
        case 4:
          if (actions.length === 0) {
            setErrors({ step4: 'At least one action is required' });
            return false;
          }
          return true;
        case 5:
          if (Object.keys(templates).length === 0) {
            setErrors({ step5: 'At least one template is required' });
            return false;
          }
          return true;
        default:
          return true;
      }
    } catch (error: any) {
      setErrors({ [`step${step}`]: error.message });
      return false;
    }
  };

  const saveDraft = async () => {
    if (!name || !lane || !trigger) return;

    try {
      const data = {
        name,
        description: description || undefined,
        lane,
        trigger,
        conditions: conditions.length > 0 ? { groups: conditions } : undefined,
        actions,
        templates,
      };

      if (automationId) {
        await updateAutomation.mutateAsync({ automationId, data });
      } else {
        const result = await createAutomation.mutateAsync(data);
        useAutomationBuilderStore.getState().setAutomationId(result.id);
      }
    } catch (error) {
      // Silent fail for autosave
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 6) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleTest = async () => {
    if (!automationId) {
      // Save draft first
      await saveDraft();
      const id = useAutomationBuilderStore.getState().automationId;
      if (!id) {
        alert('Please save draft first');
        return;
      }
    }

    try {
      const result = await testAutomation.mutateAsync({
        automationId: automationId!,
        context: testContext,
      });
      setTestResults(result);
    } catch (error: any) {
      alert(`Test failed: ${error.message}`);
    }
  };

  const handleActivate = async () => {
    if (!automationId) {
      await saveDraft();
      const id = useAutomationBuilderStore.getState().automationId;
      if (!id) {
        alert('Please save draft first');
        return;
      }
    }

    try {
      await activateAutomation.mutateAsync(automationId!);
      router.push(`/automations`);
    } catch (error: any) {
      if (error.message?.includes('test')) {
        alert('Automation must be tested after last edit. Run test mode first.');
      } else {
        alert(`Failed to activate: ${error.message}`);
      }
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* Step Indicator */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, idx) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    currentStep === step.number
                      ? 'bg-blue-600 text-white'
                      : currentStep > step.number
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {currentStep > step.number ? '✓' : step.number}
                </div>
                <div className="text-xs mt-2 text-center">{step.title}</div>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    currentStep > step.number ? 'bg-green-600' : 'bg-gray-200'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-6 min-h-[400px]">
        {currentStep === 1 && <Step1BasicInfo />}
        {currentStep === 2 && <Step2Trigger />}
        {currentStep === 3 && <Step3Conditions />}
        {currentStep === 4 && <Step4Actions />}
        {currentStep === 5 && <Step5Templates />}
        {currentStep === 6 && (
          <Step6Review
            testResults={testResults}
            testContext={testContext}
            setTestContext={setTestContext}
            onTest={handleTest}
          />
        )}
      </div>

      {/* Error Display */}
      {errors[`step${currentStep}`] && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {errors[`step${currentStep}`]}
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <div>
          {currentStep > 1 && (
            <button
              onClick={handleBack}
              className="px-4 py-2 border rounded hover:bg-gray-50"
            >
              Back
            </button>
          )}
        </div>
        <div className="flex gap-2">
          {currentStep < 6 ? (
            <>
              <button
                onClick={saveDraft}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Save Draft
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Next
              </button>
            </>
          ) : (
            <>
              <button
                onClick={saveDraft}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Save Draft
              </button>
              <button
                onClick={handleActivate}
                disabled={!testResults || activateAutomation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
              >
                {activateAutomation.isPending ? 'Activating...' : 'Activate'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 1: Basic Info
function Step1BasicInfo() {
  const { name, description, lane, setName, setDescription, setLane } =
    useAutomationBuilderStore();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
      <p className="text-sm text-gray-600 mb-4">
        Give your automation a name and select which lane it operates in.
      </p>

      <div>
        <label className="block text-sm font-medium mb-1">
          Name <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          className="w-full border rounded px-3 py-2"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Welcome New Client"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea
          className="w-full border rounded px-3 py-2"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description of what this automation does"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Lane <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full border rounded px-3 py-2"
          value={lane}
          onChange={(e) => setLane(e.target.value as any)}
        >
          <option value="">Select lane...</option>
          <option value="front_desk">Front Desk</option>
          <option value="sitter">Sitter</option>
          <option value="billing">Billing</option>
          <option value="system">System</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">
          The lane determines when and how this automation runs.
        </p>
      </div>
    </div>
  );
}

// Step 2: Trigger
function Step2Trigger() {
  const { trigger, setTrigger } = useAutomationBuilderStore();
  const [triggerType, setTriggerType] = useState<string>(trigger?.type || '');

  const handleTriggerTypeChange = (type: string) => {
    setTriggerType(type);
    // Create default trigger config based on type
    switch (type) {
      case 'booking_created':
        setTrigger({ type: 'booking_created' });
        break;
      case 'thread_created':
        setTrigger({ type: 'thread_created' });
        break;
      case 'message_received':
        setTrigger({ type: 'message_received' });
        break;
      case 'assignment_window_started':
        setTrigger({ type: 'assignment_window_started' });
        break;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Trigger</h2>
      <p className="text-sm text-gray-600 mb-4">
        When should this automation run? Select the event that triggers it.
      </p>

      <div>
        <label className="block text-sm font-medium mb-1">
          Trigger Type <span className="text-red-500">*</span>
        </label>
        <select
          className="w-full border rounded px-3 py-2"
          value={triggerType}
          onChange={(e) => handleTriggerTypeChange(e.target.value)}
        >
          <option value="">Select trigger type...</option>
          <option value="booking_created">Booking Created</option>
          <option value="thread_created">Thread Created</option>
          <option value="message_received">Message Received</option>
          <option value="assignment_window_started">Assignment Window Started</option>
        </select>
      </div>

      {trigger && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <div className="text-sm font-medium mb-2">Trigger Summary</div>
          <div className="text-sm">{describeTrigger(trigger)}</div>
        </div>
      )}

      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
        <div className="text-sm text-blue-800">
          <strong>Note:</strong> This automation will always behave the same for the same inputs.
        </div>
      </div>
    </div>
  );
}

// Step 3: Conditions
function Step3Conditions() {
  const { conditions, addConditionGroup, addConditionToGroup, removeConditionFromGroup, updateConditionInGroup } =
    useAutomationBuilderStore();

  const [editingGroup, setEditingGroup] = useState<number | null>(null);
  const [newCondition, setNewCondition] = useState<Partial<Condition>>({
    field: '',
    operator: 'equals',
    value: '',
  });

  const handleAddCondition = (groupIndex: number) => {
    if (newCondition.field && newCondition.operator && newCondition.value !== undefined) {
      addConditionToGroup(groupIndex, newCondition as Condition);
      setNewCondition({ field: '', operator: 'equals', value: '' });
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Conditions</h2>
      <p className="text-sm text-gray-600 mb-4">
        Define when this automation should run. Leave empty to always run when triggered.
      </p>

      {conditions.length === 0 && (
        <button
          onClick={addConditionGroup}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Add Condition Group
        </button>
      )}

      {conditions.map((group, groupIndex) => (
        <div key={groupIndex} className="border rounded p-4">
          <div className="flex justify-between items-center mb-3">
            <div className="text-sm font-medium">Group {groupIndex + 1}</div>
            <select
              className="text-sm border rounded px-2 py-1"
              value={group.operator}
              onChange={(e) => {
                const newConditions = [...conditions];
                newConditions[groupIndex] = { ...group, operator: e.target.value as 'AND' | 'OR' };
                useAutomationBuilderStore.getState().setConditions(newConditions);
              }}
            >
              <option value="AND">AND (all must match)</option>
              <option value="OR">OR (any can match)</option>
            </select>
          </div>

          <div className="space-y-2 mb-3">
            {group.conditions.map((condition, conditionIndex) => (
              <div key={conditionIndex} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                <div className="flex-1 text-sm">{describeCondition(condition)}</div>
                <button
                  onClick={() => removeConditionFromGroup(groupIndex, conditionIndex)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-4 gap-2">
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm"
              placeholder="Field (e.g., thread.type)"
              value={newCondition.field || ''}
              onChange={(e) => setNewCondition({ ...newCondition, field: e.target.value })}
            />
            <select
              className="border rounded px-2 py-1 text-sm"
              value={newCondition.operator || 'equals'}
              onChange={(e) => setNewCondition({ ...newCondition, operator: e.target.value as any })}
            >
              <option value="equals">equals</option>
              <option value="not_equals">not equals</option>
              <option value="contains">contains</option>
              <option value="greater_than">greater than</option>
              <option value="less_than">less than</option>
            </select>
            <input
              type="text"
              className="border rounded px-2 py-1 text-sm"
              placeholder="Value"
              value={String(newCondition.value || '')}
              onChange={(e) => setNewCondition({ ...newCondition, value: e.target.value })}
            />
            <button
              onClick={() => handleAddCondition(groupIndex)}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              Add
            </button>
          </div>
        </div>
      ))}

      {conditions.length > 0 && (
        <button
          onClick={addConditionGroup}
          className="px-4 py-2 border rounded hover:bg-gray-50"
        >
          Add Another Group
        </button>
      )}
    </div>
  );
}

// Step 4: Actions
function Step4Actions() {
  const { actions, lane, templates, addAction, removeAction, reorderAction } =
    useAutomationBuilderStore();
  const [newActionType, setNewActionType] = useState<'send_sms'>('send_sms');
  const [newActionRecipient, setNewActionRecipient] = useState<'client' | 'sitter' | 'owner'>('client');
  const [newActionTemplate, setNewActionTemplate] = useState('');

  const handleAddAction = () => {
    if (newActionTemplate) {
      addAction({
        type: 'send_sms',
        recipient: newActionRecipient,
        templateKey: newActionTemplate,
      });
      setNewActionTemplate('');
    }
  };

  const availableTemplates = Object.keys(templates);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Actions</h2>
      <p className="text-sm text-gray-600 mb-4">
        Define what this automation does. Actions run in order.
      </p>

      <div className="space-y-2 mb-4">
        {actions.map((action, index) => (
          <div key={index} className="flex items-center gap-2 bg-gray-50 p-3 rounded">
            <div className="flex-1">
              <div className="text-sm font-medium">{index + 1}. {describeAction(action)}</div>
              <div className="text-xs text-gray-500 mt-1">
                Sends from thread business number (automatically selected)
              </div>
            </div>
            <div className="flex gap-1">
              {index > 0 && (
                <button
                  onClick={() => reorderAction(index, index - 1)}
                  className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                >
                  ↑
                </button>
              )}
              {index < actions.length - 1 && (
                <button
                  onClick={() => reorderAction(index, index + 1)}
                  className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
                >
                  ↓
                </button>
              )}
              <button
                onClick={() => removeAction(index)}
                className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="border rounded p-4">
        <div className="text-sm font-medium mb-3">Add Action</div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Action Type</label>
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={newActionType}
              onChange={(e) => setNewActionType(e.target.value as any)}
            >
              <option value="send_sms">Send SMS</option>
            </select>
          </div>
          {newActionType === 'send_sms' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">Recipient</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={newActionRecipient}
                  onChange={(e) => setNewActionRecipient(e.target.value as any)}
                >
                  <option value="client">Client</option>
                  {lane === 'sitter' && <option value="sitter">Sitter</option>}
                  <option value="owner">Owner</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Template</label>
                <select
                  className="w-full border rounded px-3 py-2 text-sm"
                  value={newActionTemplate}
                  onChange={(e) => setNewActionTemplate(e.target.value)}
                >
                  <option value="">Select template...</option>
                  {availableTemplates.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Templates are defined in the next step. You can come back to add actions.
                </p>
              </div>
            </>
          )}
          <button
            onClick={handleAddAction}
            disabled={!newActionTemplate}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Add Action
          </button>
        </div>
      </div>
    </div>
  );
}

// Step 5: Templates
function Step5Templates() {
  const { templates, setTemplate, removeTemplate } = useAutomationBuilderStore();
  const [newTemplateKey, setNewTemplateKey] = useState('');
  const [newTemplateValue, setNewTemplateValue] = useState('');
  const [sampleVariables, setSampleVariables] = useState('{}');

  const renderPreview = (template: string): string => {
    try {
      const vars = JSON.parse(sampleVariables);
      let rendered = template;
      for (const [key, value] of Object.entries(vars)) {
        rendered = rendered.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
      }
      return rendered;
    } catch {
      return template;
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Templates</h2>
      <p className="text-sm text-gray-600 mb-4">
        Define message templates with variables. Use {'{{variable}}'} syntax.
      </p>

      <div className="space-y-3 mb-4">
        {Object.entries(templates).map(([key, value]) => (
          <div key={key} className="border rounded p-4">
            <div className="flex justify-between items-center mb-2">
              <div className="text-sm font-medium">{key}</div>
              <button
                onClick={() => removeTemplate(key)}
                className="text-xs text-red-600 hover:text-red-800"
              >
                Remove
              </button>
            </div>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm font-mono"
              rows={3}
              value={value}
              onChange={(e) => setTemplate(key, e.target.value)}
            />
            <div className="mt-2 text-xs text-gray-500">
              Preview: {renderPreview(value)}
            </div>
          </div>
        ))}
      </div>

      <div className="border rounded p-4">
        <div className="text-sm font-medium mb-3">Add Template</div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Template Key</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2 text-sm"
              value={newTemplateKey}
              onChange={(e) => setNewTemplateKey(e.target.value)}
              placeholder="e.g., welcome_message"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Template Content</label>
            <textarea
              className="w-full border rounded px-3 py-2 text-sm font-mono"
              rows={4}
              value={newTemplateValue}
              onChange={(e) => setNewTemplateValue(e.target.value)}
              placeholder="Hello {{clientName}}, welcome to our service!"
            />
          </div>
          <button
            onClick={() => {
              if (newTemplateKey && newTemplateValue) {
                setTemplate(newTemplateKey, newTemplateValue);
                setNewTemplateKey('');
                setNewTemplateValue('');
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Add Template
          </button>
        </div>
      </div>

      <div className="border rounded p-4 bg-gray-50">
        <div className="text-sm font-medium mb-2">Preview Variables (JSON)</div>
        <textarea
          className="w-full border rounded px-3 py-2 text-sm font-mono"
          rows={3}
          value={sampleVariables}
          onChange={(e) => setSampleVariables(e.target.value)}
          placeholder='{"clientName": "John", "bookingId": "123"}'
        />
        <p className="text-xs text-gray-500 mt-1">
          Use this to preview how templates render with sample data.
        </p>
      </div>
    </div>
  );
}

// Step 6: Review & Test
function Step6Review({
  testResults,
  testContext,
  setTestContext,
  onTest,
}: {
  testResults: any;
  testContext: Record<string, unknown>;
  setTestContext: (context: Record<string, unknown>) => void;
  onTest: () => void;
}) {
  const { name, description, lane, trigger, conditions, actions, templates } =
    useAutomationBuilderStore();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold mb-4">Review & Test</h2>

      {/* Summary */}
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium text-gray-500">Name</div>
          <div className="text-lg">{name}</div>
        </div>
        {description && (
          <div>
            <div className="text-sm font-medium text-gray-500">Description</div>
            <div>{description}</div>
          </div>
        )}
        <div>
          <div className="text-sm font-medium text-gray-500">Lane</div>
          <div>{lane}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">Trigger</div>
          <div>{trigger ? describeTrigger(trigger) : 'Not set'}</div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">Conditions</div>
          <div>
            {conditions.length === 0 ? (
              'No conditions (always runs when triggered)'
            ) : (
              <ul className="list-disc list-inside">
                {conditions.map((group, idx) => (
                  <li key={idx}>
                    {group.operator}: {group.conditions.map(describeCondition).join(', ')}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">Actions</div>
          <ol className="list-decimal list-inside">
            {actions.map((action, idx) => (
              <li key={idx}>{describeAction(action)}</li>
            ))}
          </ol>
        </div>
        <div>
          <div className="text-sm font-medium text-gray-500">Templates</div>
          <ul className="list-disc list-inside">
            {Object.keys(templates).map((key) => (
              <li key={key}>
                <strong>{key}:</strong> {templates[key].substring(0, 50)}...
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Test Section */}
      <div className="border rounded p-4 bg-blue-50">
        <h3 className="text-lg font-semibold mb-3">Test Automation</h3>
        <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded p-3">
          <div className="text-sm font-medium text-yellow-800 mb-1">⚠️ Test Mode</div>
          <div className="text-sm text-yellow-700">No messages will be sent. This is a simulation.</div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Test Context (JSON)</label>
          <textarea
            className="w-full border rounded px-3 py-2 font-mono text-sm"
            rows={6}
            value={JSON.stringify(testContext, null, 2)}
            onChange={(e) => {
              try {
                setTestContext(JSON.parse(e.target.value));
              } catch {
                // Invalid JSON
              }
            }}
            placeholder='{"threadId": "...", "clientId": "..."}'
          />
        </div>

        <button
          onClick={onTest}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Run Test
        </button>

        {testResults && (
          <div className="mt-4 space-y-3">
            <div className="bg-green-50 border border-green-200 rounded p-3">
              <div className="text-sm font-medium text-green-800 mb-2">Test Results</div>
              {testResults.conditionResults && (
                <div className="mb-2">
                  <div className="text-xs font-medium">Conditions:</div>
                  <pre className="text-xs bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(testResults.conditionResults, null, 2)}
                  </pre>
                </div>
              )}
              {testResults.actionPlan && (
                <div className="mb-2">
                  <div className="text-xs font-medium">Action Plan:</div>
                  <pre className="text-xs bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(testResults.actionPlan, null, 2)}
                  </pre>
                </div>
              )}
              {testResults.renderedTemplates && (
                <div>
                  <div className="text-xs font-medium">Rendered Templates:</div>
                  <pre className="text-xs bg-white p-2 rounded overflow-auto">
                    {JSON.stringify(testResults.renderedTemplates, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
