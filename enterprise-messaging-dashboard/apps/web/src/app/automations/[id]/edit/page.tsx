'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { RequireAuth } from '@/lib/auth';
import { AutomationBuilderStepper } from '@/components/automations/AutomationBuilderStepper';
import { useAutomation } from '@/lib/api/automations-hooks';
import { useAutomationBuilderStore } from '@/lib/store/automation-builder-store';

function EditAutomationPage() {
  const params = useParams();
  const router = useRouter();
  const automationId = params.id as string;
  const { data: automation, isLoading } = useAutomation(automationId);
  const loadAutomation = useAutomationBuilderStore((state) => state.loadAutomation);
  const setAutomationId = useAutomationBuilderStore((state) => state.setAutomationId);

  useEffect(() => {
    if (automation) {
      loadAutomation(automation);
      setAutomationId(automationId);
    }
  }, [automation, loadAutomation, setAutomationId, automationId]);

  if (isLoading) {
    return (
      <RequireAuth requireOwner>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center text-gray-500">Loading automation...</div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  if (!automation) {
    return (
      <RequireAuth requireOwner>
        <div className="min-h-screen bg-gray-50 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center text-red-500">Automation not found</div>
          </div>
        </div>
      </RequireAuth>
    );
  }

  return (
    <RequireAuth requireOwner>
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Edit Automation: {automation.name}</h1>
          <AutomationBuilderStepper />
        </div>
      </div>
    </RequireAuth>
  );
}

export default EditAutomationPage;
