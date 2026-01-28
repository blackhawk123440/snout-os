'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RequireAuth, useAuth } from '@/lib/auth';
import {
  useProviderStatus,
  useTestConnection,
  useConnectProvider,
  useBuyNumbers,
  useImportNumbers,
  useNumbersStatus,
  useInstallWebhooks,
  useWebhookStatus,
  useReadiness,
  useSetupProgress,
  useSaveSetupProgress,
  useFinishSetup,
} from '@/lib/api/setup-hooks';

/**
 * Setup Wizard - 7 Steps
 * 
 * Step 1: Connect Provider
 * Step 2: Verify Connectivity
 * Step 3: Front Desk Number
 * Step 4: Sitter Numbers (optional)
 * Step 5: Pool Numbers (optional)
 * Step 6: Webhook Installation
 * Step 7: System Readiness Validation
 */
function SetupWizardContent() {
  const router = useRouter();
  const { isOwner } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [wizardData, setWizardData] = useState<Record<string, unknown>>({});

  // Step 1: Provider connection
  const [accountSid, setAccountSid] = useState('');
  const [authToken, setAuthToken] = useState('');
  const [connectionTested, setConnectionTested] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Step 3-5: Number selection
  const [frontDeskNumber, setFrontDeskNumber] = useState('');
  const [sitterNumbers, setSitterNumbers] = useState<string[]>([]);
  const [poolNumbers, setPoolNumbers] = useState<string[]>([]);
  const [buyAreaCode, setBuyAreaCode] = useState('');
  const [buyQuantity, setBuyQuantity] = useState(1);
  const [costPreview, setCostPreview] = useState<number | null>(null);

  // Step 6: Webhook
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Hooks
  const providerStatus = useProviderStatus();
  const testConnection = useTestConnection();
  const connectProvider = useConnectProvider();
  const buyNumbers = useBuyNumbers();
  const importNumbers = useImportNumbers();
  const numbersStatus = useNumbersStatus();
  const installWebhooks = useInstallWebhooks();
  const webhookStatus = useWebhookStatus();
  const readiness = useReadiness();
  const setupProgress = useSetupProgress();
  const saveProgress = useSaveSetupProgress();
  const finishSetup = useFinishSetup();

  // Load saved progress
  useEffect(() => {
    if (setupProgress.data) {
      setCurrentStep(setupProgress.data.step);
      setCompletedSteps(setupProgress.data.completedSteps);
      if (setupProgress.data.data) {
        setWizardData(setupProgress.data.data);
      }
    }
  }, [setupProgress.data]);

  // Determine completed steps from status
  useEffect(() => {
    const completed: number[] = [];

    // Step 1-2: Provider connected
    if (providerStatus.data?.connected) {
      completed.push(1, 2);
    }

    // Step 3: Front desk number
    if (numbersStatus.data?.hasFrontDesk) {
      completed.push(3);
    }

    // Step 4: Sitter numbers (optional)
    if (numbersStatus.data?.sitter.count > 0) {
      completed.push(4);
    }

    // Step 5: Pool numbers (optional)
    if (numbersStatus.data?.pool.count > 0) {
      completed.push(5);
    }

    // Step 6: Webhooks
    if (webhookStatus.data?.verified) {
      completed.push(6);
    }

    // Step 7: Readiness
    if (readiness.data?.ready) {
      completed.push(7);
    }

    setCompletedSteps(completed);
  }, [
    providerStatus.data,
    numbersStatus.data,
    webhookStatus.data,
    readiness.data,
  ]);

  const handleTestConnection = async () => {
    setConnectionError(null);
    try {
      const result = await testConnection.mutateAsync({
        accountSid: accountSid || undefined,
        authToken: authToken || undefined,
      });

      if (result.success) {
        setConnectionTested(true);
        setConnectionError(null);
      } else {
        setConnectionTested(false);
        setConnectionError(result.error || 'Connection test failed');
      }
    } catch (error: any) {
      setConnectionTested(false);
      setConnectionError(error.message || 'Connection test failed');
    }
  };

  const handleConnectProvider = async () => {
    if (!accountSid || !authToken) {
      setConnectionError('Please enter both Account SID and Auth Token');
      return;
    }

    try {
      await connectProvider.mutateAsync({ accountSid, authToken });
      setConnectionTested(true);
      setConnectionError(null);
      await saveProgress.mutateAsync({ step: 2, data: { accountSid } });
      setCurrentStep(2);
    } catch (error: any) {
      setConnectionError(error.message || 'Failed to connect provider');
    }
  };

  const handleBuyNumber = async (numberClass: 'front_desk' | 'sitter' | 'pool') => {
    try {
      const result = await buyNumbers.mutateAsync({
        class: numberClass,
        areaCode: buyAreaCode || undefined,
        quantity: buyQuantity,
      });

      if (result.success && result.numbers.length > 0) {
        if (numberClass === 'front_desk') {
          setFrontDeskNumber(result.numbers[0].e164);
        } else if (numberClass === 'sitter') {
          setSitterNumbers([...sitterNumbers, ...result.numbers.map((n) => n.e164)]);
        } else {
          setPoolNumbers([...poolNumbers, ...result.numbers.map((n) => n.e164)]);
        }

        setCostPreview(result.totalCost || null);
        await saveProgress.mutateAsync({ step: currentStep + 1 });
      }
    } catch (error: any) {
      alert(`Failed to purchase number: ${error.message}`);
    }
  };

  const handleImportNumber = async (numberClass: 'front_desk' | 'sitter' | 'pool', e164: string) => {
    try {
      const result = await importNumbers.mutateAsync({
        class: numberClass,
        e164s: [e164],
      });

      if (result.success && result.numbers.length > 0) {
        if (numberClass === 'front_desk') {
          setFrontDeskNumber(result.numbers[0].e164);
        } else if (numberClass === 'sitter') {
          setSitterNumbers([...sitterNumbers, result.numbers[0].e164]);
        } else {
          setPoolNumbers([...poolNumbers, result.numbers[0].e164]);
        }
      }
    } catch (error: any) {
      alert(`Failed to import number: ${error.message}`);
    }
  };

  const handleInstallWebhooks = async () => {
    try {
      await installWebhooks.mutateAsync();
      // Status will update via polling
    } catch (error: any) {
      alert(`Failed to install webhooks: ${error.message}`);
    }
  };

  const handleFinish = async () => {
    if (!readiness.data?.ready) {
      alert('Please complete all required checks before finishing setup.');
      return;
    }

    try {
      await finishSetup.mutateAsync();
      router.push('/dashboard');
    } catch (error: any) {
      alert(`Failed to complete setup: ${error.message}`);
    }
  };

  const canProceed = (step: number): boolean => {
    switch (step) {
      case 1:
        return connectionTested && !connectionError;
      case 2:
        return providerStatus.data?.connected === true;
      case 3:
        return numbersStatus.data?.hasFrontDesk === true;
      case 4:
      case 5:
        return true; // Optional steps
      case 6:
        return webhookStatus.data?.verified === true;
      case 7:
        return readiness.data?.ready === true;
      default:
        return false;
    }
  };

  const getStepStatus = (step: number): 'completed' | 'current' | 'pending' => {
    if (completedSteps.includes(step)) return 'completed';
    if (step === currentStep) return 'current';
    return 'pending';
  };

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Access denied. Owner access required.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Messaging Setup Wizard</h1>
          <p className="text-gray-600">
            Configure your messaging provider and numbers to get started
          </p>
          {providerStatus.data?.providerMode === 'mock' && (
            <div className="mt-2">
              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                Provider: Mock (Development Mode)
              </span>
            </div>
          )}
        </div>

        {/* Progress Bar */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep} of 7</span>
            <span className="text-sm text-gray-500">
              {Math.round((completedSteps.length / 7) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${(completedSteps.length / 7) * 100}%` }}
            />
          </div>

          {/* Step Indicators */}
          <div className="flex justify-between mt-6">
            {[1, 2, 3, 4, 5, 6, 7].map((step) => {
              const status = getStepStatus(step);
              return (
                <div key={step} className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      status === 'completed'
                        ? 'bg-green-500 text-white'
                        : status === 'current'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {status === 'completed' ? '✓' : step}
                  </div>
                  <div className="text-xs mt-1 text-gray-500">Step {step}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* Step 1: Connect Provider */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Step 1: Connect Provider</h2>
              <p className="text-gray-600 mb-6">
                Enter your provider credentials to connect your messaging account.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Account SID</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={accountSid}
                    onChange={(e) => setAccountSid(e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Find this in your provider account settings
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Auth Token</label>
                  <input
                    type="password"
                    className="w-full border rounded px-3 py-2"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="Enter your auth token"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Keep this secure and never share it
                  </p>
                </div>

                {connectionError && (
                  <div className="bg-red-50 border border-red-200 rounded p-3">
                    <p className="text-sm text-red-800">{connectionError}</p>
                    <p className="text-xs text-red-600 mt-1">
                      What to do: Check your credentials and try again. If the error persists,
                      verify your account has sufficient balance and API access enabled.
                    </p>
                  </div>
                )}

                {connectionTested && !connectionError && (
                  <div className="bg-green-50 border border-green-200 rounded p-3">
                    <p className="text-sm text-green-800">✓ Connection successful</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={handleTestConnection}
                    disabled={testConnection.isPending}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 disabled:opacity-50"
                  >
                    {testConnection.isPending ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={handleConnectProvider}
                    disabled={!connectionTested || connectProvider.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {connectProvider.isPending ? 'Connecting...' : 'Connect & Continue'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Verify Connectivity */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Step 2: Verify Connectivity</h2>
              <p className="text-gray-600 mb-6">
                Verifying your provider connection and permissions...
              </p>

              {providerStatus.isLoading ? (
                <div className="text-center py-8 text-gray-500">Checking connection...</div>
              ) : providerStatus.data?.connected ? (
                <div className="space-y-3">
                  <div className="flex items-center text-green-600">
                    <span className="mr-2">✓</span>
                    <span>Account access verified</span>
                  </div>
                  <div className="flex items-center text-green-600">
                    <span className="mr-2">✓</span>
                    <span>API permissions verified</span>
                  </div>
                  {providerStatus.data.accountName && (
                    <div className="text-sm text-gray-600 mt-4">
                      Connected to: {providerStatus.data.accountName}
                    </div>
                  )}
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm text-red-800">
                    Connection verification failed: {providerStatus.data?.error || 'Unknown error'}
                  </p>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Go Back to Step 1
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Front Desk Number */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Step 3: Front Desk Number</h2>
              <p className="text-gray-600 mb-6">
                Select or purchase a Front Desk number for general inquiries. At least one Front
                Desk number is required.
              </p>

              {numbersStatus.data?.hasFrontDesk ? (
                <div className="bg-green-50 border border-green-200 rounded p-4 mb-4">
                  <p className="text-sm text-green-800">
                    ✓ Front Desk number configured: {numbersStatus.data.frontDesk.numbers[0]?.e164}
                  </p>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="mt-3 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium mb-2">Purchase New Number</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Area code (optional)"
                        className="border rounded px-3 py-2"
                        value={buyAreaCode}
                        onChange={(e) => setBuyAreaCode(e.target.value)}
                      />
                      <input
                        type="number"
                        placeholder="Quantity"
                        min={1}
                        max={10}
                        className="border rounded px-3 py-2 w-24"
                        value={buyQuantity}
                        onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 1)}
                      />
                      <button
                        onClick={() => handleBuyNumber('front_desk')}
                        disabled={buyNumbers.isPending}
                        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {buyNumbers.isPending ? 'Purchasing...' : 'Purchase'}
                      </button>
                    </div>
                    {costPreview && (
                      <p className="text-sm text-gray-600 mt-2">
                        Estimated cost: ${costPreview.toFixed(2)}/month
                      </p>
                    )}
                  </div>

                  <div className="border-t pt-4">
                    <h3 className="font-medium mb-2">Import Existing Number</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="+15551234567"
                        className="flex-1 border rounded px-3 py-2"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const input = e.currentTarget as HTMLInputElement;
                            if (input.value) {
                              handleImportNumber('front_desk', input.value);
                              input.value = '';
                            }
                          }
                        }}
                      />
                      <button
                        onClick={(e) => {
                          const input = (e.target as HTMLElement)
                            .previousElementSibling as HTMLInputElement;
                          if (input.value) {
                            handleImportNumber('front_desk', input.value);
                            input.value = '';
                          }
                        }}
                        className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                      >
                        Import
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Sitter Numbers (Optional) */}
          {currentStep === 4 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Step 4: Sitter Numbers (Optional)</h2>
              <p className="text-gray-600 mb-6">
                Configure dedicated numbers for sitters. You can skip this step and add sitter
                numbers later.
              </p>

              <div className="space-y-4">
                {/* Same purchase/import UI as Step 3 */}
                <div>
                  <h3 className="font-medium mb-2">Purchase New Number</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Area code (optional)"
                      className="border rounded px-3 py-2"
                      value={buyAreaCode}
                      onChange={(e) => setBuyAreaCode(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Quantity"
                      min={1}
                      max={10}
                      className="border rounded px-3 py-2 w-24"
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 1)}
                    />
                    <button
                      onClick={() => handleBuyNumber('sitter')}
                      disabled={buyNumbers.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {buyNumbers.isPending ? 'Purchasing...' : 'Purchase'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => setCurrentStep(5)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Pool Numbers (Optional) */}
          {currentStep === 5 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Step 5: Pool Numbers (Optional)</h2>
              <p className="text-gray-600 mb-6">
                Configure pool numbers for shared use. You can skip this step and add pool numbers
                later.
              </p>

              <div className="space-y-4">
                {/* Same purchase/import UI */}
                <div>
                  <h3 className="font-medium mb-2">Purchase New Number</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Area code (optional)"
                      className="border rounded px-3 py-2"
                      value={buyAreaCode}
                      onChange={(e) => setBuyAreaCode(e.target.value)}
                    />
                    <input
                      type="number"
                      placeholder="Quantity"
                      min={1}
                      max={10}
                      className="border rounded px-3 py-2 w-24"
                      value={buyQuantity}
                      onChange={(e) => setBuyQuantity(parseInt(e.target.value) || 1)}
                    />
                    <button
                      onClick={() => handleBuyNumber('pool')}
                      disabled={buyNumbers.isPending}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {buyNumbers.isPending ? 'Purchasing...' : 'Purchase'}
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentStep(6)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => setCurrentStep(6)}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Continue
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Webhook Installation */}
          {currentStep === 6 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Step 6: Webhook Installation</h2>
              <p className="text-gray-600 mb-6">
                Webhooks allow the system to receive incoming messages and delivery status updates.
                This step configures webhooks automatically.
              </p>

              {webhookStatus.isLoading ? (
                <div className="text-center py-8 text-gray-500">Checking webhook status...</div>
              ) : webhookStatus.data?.verified ? (
                <div className="bg-green-50 border border-green-200 rounded p-4">
                  <div className="space-y-2">
                    <div className="flex items-center text-green-600">
                      <span className="mr-2">✓</span>
                      <span>Webhooks configured</span>
                    </div>
                    <div className="flex items-center text-green-600">
                      <span className="mr-2">✓</span>
                      <span>Webhooks active</span>
                    </div>
                    <div className="flex items-center text-green-600">
                      <span className="mr-2">✓</span>
                      <span>Webhooks verified</span>
                    </div>
                    {showDiagnostics && webhookStatus.data.webhookUrl && (
                      <div className="mt-4 text-sm">
                        <div className="font-medium mb-1">Webhook URL:</div>
                        <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                          {webhookStatus.data.webhookUrl}
                        </code>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => setCurrentStep(7)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Continue
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      Webhooks are not yet configured. Click the button below to install them
                      automatically.
                    </p>
                  </div>
                  <button
                    onClick={handleInstallWebhooks}
                    disabled={installWebhooks.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                  >
                    {installWebhooks.isPending ? 'Installing...' : 'Install Webhooks'}
                  </button>
                  {webhookStatus.data?.error && (
                    <div className="bg-red-50 border border-red-200 rounded p-3">
                      <p className="text-sm text-red-800">
                        Error: {webhookStatus.data.error}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 7: System Readiness */}
          {currentStep === 7 && (
            <div>
              <h2 className="text-2xl font-semibold mb-4">Step 7: System Readiness</h2>
              <p className="text-gray-600 mb-6">
                Final validation to ensure everything is configured correctly.
              </p>

              {readiness.isLoading ? (
                <div className="text-center py-8 text-gray-500">Checking readiness...</div>
              ) : readiness.data?.ready ? (
                <div className="space-y-4">
                  {readiness.data.checks.map((check, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center p-3 rounded ${
                        check.passed ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <span className={`mr-2 ${check.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {check.passed ? '✓' : '✗'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{check.name}</div>
                        {check.error && (
                          <div className="text-sm text-red-600 mt-1">{check.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={handleFinish}
                    disabled={finishSetup.isPending}
                    className="mt-4 px-6 py-3 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 font-medium"
                  >
                    {finishSetup.isPending ? 'Completing...' : 'Finish Setup'}
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {readiness.data?.checks.map((check, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center p-3 rounded ${
                        check.passed ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <span className={`mr-2 ${check.passed ? 'text-green-600' : 'text-red-600'}`}>
                        {check.passed ? '✓' : '✗'}
                      </span>
                      <div className="flex-1">
                        <div className="font-medium">{check.name}</div>
                        {check.error && (
                          <div className="text-sm text-red-600 mt-1">{check.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                    <p className="text-sm text-yellow-800">
                      Please resolve all failed checks before completing setup.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          {currentStep > 1 && currentStep < 7 && (
            <div className="flex justify-between mt-6 pt-6 border-t">
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Back
              </button>
              {canProceed(currentStep) && (
                <button
                  onClick={() => setCurrentStep(currentStep + 1)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SetupPage() {
  return (
    <RequireAuth requireOwner>
      <SetupWizardContent />
    </RequireAuth>
  );
}
