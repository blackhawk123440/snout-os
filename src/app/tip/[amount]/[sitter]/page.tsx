"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { COLORS } from "@/lib/booking-utils";

/**
 * Tip page component
 * Accessible at: /tip/[amount]/[sitter]
 * Example: /tip/20/njkdc
 * 
 * This page can be customized with your branding and tip options
 */
export default function TipPage() {
  const params = useParams();
  const amount = parseFloat(params.amount as string) || 0;
  const sitter = params.sitter as string || 'snout-services';
  
  const [tipPercent, setTipPercent] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState<string>("");
  
  const tipOptions = [
    { percent: 10, label: "10%", amount: amount * 0.10 },
    { percent: 15, label: "15%", amount: amount * 0.15 },
    { percent: 20, label: "20%", amount: amount * 0.20 },
    { percent: 25, label: "25%", amount: amount * 0.25 },
  ];

  const totalWithTip = tipPercent ? amount + (amount * tipPercent / 100) : amount;
  const customTipAmount = parseFloat(customAmount) || 0;
  const totalWithCustomTip = customAmount ? amount + customTipAmount : amount;

  const handleTipSelection = (percent: number) => {
    setTipPercent(percent);
    setCustomAmount("");
  };

  const handleCustomAmount = (value: string) => {
    setCustomAmount(value);
    setTipPercent(null);
  };

  const handleSubmit = () => {
    // TODO: Implement tip payment processing
    // This could integrate with Stripe or your payment provider
    const finalTip = tipPercent ? amount * tipPercent / 100 : customTipAmount;
    const finalTotal = amount + finalTip;
    
    console.log("Tip submission:", {
      serviceAmount: amount,
      tipAmount: finalTip,
      totalAmount: finalTotal,
      sitter,
    });
    
    // Redirect to payment processing or show success message
    alert(`Thank you! Tip of $${finalTip.toFixed(2)} (Total: $${finalTotal.toFixed(2)}) will be processed.`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: COLORS.primaryLight }}>
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: COLORS.primary }}>
            <i className="fas fa-heart text-2xl" style={{ color: COLORS.primaryLight }}></i>
          </div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: COLORS.primary }}>
            Thank Your Sitter!
          </h1>
          <p className="text-gray-600">
            Service Amount: <span className="font-semibold">${amount.toFixed(2)}</span>
          </p>
        </div>

        <div className="space-y-6">
          {/* Tip Percentage Options */}
          <div>
            <label className="block text-sm font-medium mb-3" style={{ color: COLORS.primary }}>
              Select Tip Percentage
            </label>
            <div className="grid grid-cols-2 gap-3">
              {tipOptions.map((option) => (
                <button
                  key={option.percent}
                  onClick={() => handleTipSelection(option.percent)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    tipPercent === option.percent
                      ? 'border-opacity-100 shadow-md'
                      : 'border-opacity-50 hover:border-opacity-75'
                  }`}
                  style={{
                    borderColor: tipPercent === option.percent ? COLORS.primary : COLORS.border,
                    background: tipPercent === option.percent ? COLORS.primaryLight : 'white',
                  }}
                >
                  <div className="font-bold text-lg" style={{ color: COLORS.primary }}>
                    {option.label}
                  </div>
                  <div className="text-sm text-gray-600">
                    ${option.amount.toFixed(2)}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: COLORS.primary }}>
              Or Enter Custom Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">$</span>
              <input
                type="number"
                value={customAmount}
                onChange={(e) => handleCustomAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                className="w-full pl-8 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2"
                style={{
                  borderColor: COLORS.border,
                  '--tw-ring-color': COLORS.primaryLight + '40',
                } as React.CSSProperties & { '--tw-ring-color'?: string }}
              />
            </div>
          </div>

          {/* Total Summary */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Service Amount:</span>
              <span className="font-medium">${amount.toFixed(2)}</span>
            </div>
            {(tipPercent || customTipAmount > 0) && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Tip:</span>
                <span className="font-medium" style={{ color: COLORS.primary }}>
                  ${(tipPercent ? amount * tipPercent / 100 : customTipAmount).toFixed(2)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span style={{ color: COLORS.primary }}>Total:</span>
              <span style={{ color: COLORS.primary }}>
                ${(tipPercent ? totalWithTip : customAmount ? totalWithCustomTip : amount).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!tipPercent && !customTipAmount}
            className="w-full py-4 rounded-lg font-bold text-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: COLORS.primary,
              color: COLORS.primaryLight,
            }}
          >
            Complete Tip Payment
          </button>
        </div>

        <p className="text-center text-xs text-gray-500 mt-6">
          Your tip goes directly to your sitter
        </p>
      </div>
    </div>
  );
}

