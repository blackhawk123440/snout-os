'use client';

import { useEffect } from 'react';
import { RequireAuth } from '@/lib/auth';
import { AutomationBuilderStepper } from '@/components/automations/AutomationBuilderStepper';
import { useAutomationBuilderStore } from '@/lib/store/automation-builder-store';

function NewAutomationPage() {
  const reset = useAutomationBuilderStore((state) => state.reset);

  useEffect(() => {
    reset();
  }, [reset]);

  return (
    <RequireAuth requireOwner>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Create Automation</h1>
          <AutomationBuilderStepper />
        </div>
      </div>
    </RequireAuth>
  );
}

export default NewAutomationPage;
