import React, { useState } from "react";
import { SubscriptionPlan, Subscription } from "../types";

interface Props {
  user: any;
  onPurchase: (plan: SubscriptionPlan, billingCycle: "monthly" | "yearly") => void;
}

export default function SubscriptionPage({ user, onPurchase }: Props) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const plans = [
    {
      id: SubscriptionPlan.BASIC_MONTHLY,
      name: "Basic",
      monthlyPrice: 29,
      yearlyPrice: 290,
      features: [
        "1,000 SMS messages/month",
        "1,000 Email messages/month",
        "1,000 WhatsApp messages/month",
        "Email support",
        "Basic analytics",
      ],
    },
    {
      id: SubscriptionPlan.PRO_MONTHLY,
      name: "Pro",
      monthlyPrice: 79,
      yearlyPrice: 790,
      features: [
        "10,000 SMS messages/month",
        "10,000 Email messages/month",
        "10,000 WhatsApp messages/month",
        "Priority support",
        "Advanced analytics",
        "API access",
      ],
    },
    {
      id: SubscriptionPlan.ENTERPRISE_MONTHLY,
      name: "Enterprise",
      monthlyPrice: 199,
      yearlyPrice: 1990,
      features: [
        "100,000 SMS messages/month",
        "100,000 Email messages/month",
        "100,000 WhatsApp messages/month",
        "24/7 dedicated support",
        "Custom integrations",
        "White-label solution",
        "SLA guarantee",
      ],
    },
  ];

  const handlePurchase = (planId: SubscriptionPlan) => {
    setSelectedPlan(planId);
    onPurchase(planId, billingCycle);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
        <p className="text-lg text-gray-600 mb-8">Select the perfect plan for your business needs</p>
        
        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4">
          <span className={`text-lg ${billingCycle === "monthly" ? "font-semibold text-gray-900" : "text-gray-500"}`}>
            Monthly
          </span>
          <button
            onClick={() => setBillingCycle(billingCycle === "monthly" ? "yearly" : "monthly")}
            className="relative inline-flex h-8 w-14 items-center rounded-full bg-indigo-600 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            <span
              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                billingCycle === "yearly" ? "translate-x-7" : "translate-x-1"
              }`}
            />
          </button>
          <span className={`text-lg ${billingCycle === "yearly" ? "font-semibold text-gray-900" : "text-gray-500"}`}>
            Yearly <span className="text-sm text-green-600 font-semibold">(Save 17%)</span>
          </span>
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const price = billingCycle === "monthly" ? plan.monthlyPrice : plan.yearlyPrice;
          const planId = billingCycle === "monthly" 
            ? plan.id 
            : plan.id.replace("_monthly", "_yearly") as SubscriptionPlan;

          return (
            <div
              key={plan.id}
              className="bg-white rounded-2xl shadow-lg border-2 border-gray-100 hover:border-indigo-500 transition-all duration-300 overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-bold text-gray-900">${price}</span>
                  <span className="text-gray-600">/{billingCycle}</span>
                </div>
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => handlePurchase(planId)}
                  className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Purchase Plan
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Free Plan */}
      <div className="mt-12 text-center">
        <div className="inline-block bg-gray-100 rounded-2xl p-8 max-w-md">
          <h3 className="text-xl font-bold text-gray-900 mb-2">Free Plan</h3>
          <p className="text-gray-600 mb-4">
            Try our service with limited features
          </p>
          <ul className="text-left space-y-2 mb-6 text-gray-700">
            <li>• 100 SMS messages/month</li>
            <li>• 100 Email messages/month</li>
            <li>• 100 WhatsApp messages/month</li>
            <li>• Basic support</li>
          </ul>
          <button
            onClick={() => handlePurchase(SubscriptionPlan.FREE)}
            className="w-full bg-gray-800 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Start Free Trial
          </button>
        </div>
      </div>
    </div>
  );
}
