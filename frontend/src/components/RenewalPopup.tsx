import React from "react";
import { X, AlertCircle, CreditCard, RefreshCw } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  error: string;
  code?: string;
  onRenew: () => void;
}

export default function RenewalPopup({ isOpen, onClose, error, code, onRenew }: Props) {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (code) {
      case "SUBSCRIPTION_EXPIRED":
        return <AlertCircle className="h-12 w-12 text-red-500" />;
      case "SUBSCRIPTION_INACTIVE":
        return <AlertCircle className="h-12 w-12 text-yellow-500" />;
      case "USAGE_LIMIT_EXCEEDED":
        return <RefreshCw className="h-12 w-12 text-orange-500" />;
      default:
        return <AlertCircle className="h-12 w-12 text-gray-500" />;
    }
  };

  const getTitle = () => {
    switch (code) {
      case "SUBSCRIPTION_EXPIRED":
        return "Subscription Expired";
      case "SUBSCRIPTION_INACTIVE":
        return "Subscription Inactive";
      case "USAGE_LIMIT_EXCEEDED":
        return "Usage Limit Exceeded";
      case "NO_SUBSCRIPTION":
        return "No Subscription Found";
      case "PRODUCT_DISABLED":
        return "Service Disabled";
      default:
        return "Subscription Required";
    }
  };

  const getDescription = () => {
    switch (code) {
      case "SUBSCRIPTION_EXPIRED":
        return "Your subscription has expired. Please renew your subscription to continue sending messages.";
      case "SUBSCRIPTION_INACTIVE":
        return "Your subscription is currently inactive. Please contact support to reactivate your subscription.";
      case "USAGE_LIMIT_EXCEEDED":
        return "You have reached your monthly usage limit. Please upgrade your subscription to continue sending messages.";
      case "NO_SUBSCRIPTION":
        return "No active subscription found for your company. Please purchase a subscription to use this service.";
      case "PRODUCT_DISABLED":
        return "This service is currently disabled for your subscription. Please contact support to enable it.";
      default:
        return error || "Please renew your subscription to continue using this service.";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8 text-center">
          <div className="mx-auto mb-4 bg-white bg-opacity-20 rounded-full p-4 inline-block">
            {getIcon()}
          </div>
          <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-8">
          <p className="text-gray-600 text-center mb-6">{getDescription()}</p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-sm text-gray-700">{error}</p>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={onRenew}
              className="w-full flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-700 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              <CreditCard className="h-5 w-5 mr-2" />
              Renew Subscription
            </button>
            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-100 text-gray-700 rounded-lg font-semibold hover:bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
            >
              Close
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
