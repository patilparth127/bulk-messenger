import React, { useState, useEffect } from "react";
import { CreditCard, Calendar, CheckCircle, XCircle, TrendingUp, Activity, Settings, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Subscription, Company, SubscriptionStatus } from "../types";
import { getSubscriptions, getCompanySubscription, createSubscription, updateSubscription, getCompany } from "../utils/api";

interface Props {
  companyId?: string;
  user: any;
}

export default function SubscriptionManagement({ companyId, user }: Props) {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [companySubscription, setCompanySubscription] = useState<Subscription | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    plan: "MONTHLY",
    autoRenew: true,
    products: [
      { productType: "EMAIL", isEnabled: true, usageLimit: 1000, currentUsage: 0 },
      { productType: "WHATSAPP", isEnabled: true, usageLimit: 1000, currentUsage: 0 },
      { productType: "SMS", isEnabled: true, usageLimit: 1000, currentUsage: 0 },
    ],
  });

  useEffect(() => {
    fetchData();
  }, [companyId]);

  const fetchData = async () => {
    try {
      if (companyId) {
        const [subData, companyData] = await Promise.all([
          getCompanySubscription(companyId),
          getCompany(companyId),
        ]);
        setCompanySubscription(subData);
        setCompany(companyData);
      } else {
        const data = await getSubscriptions();
        setSubscriptions(data);
      }
    } catch (error) {
      toast.error("Failed to fetch subscription data");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async () => {
    if (!companyId) {
      toast.error("Company ID is required");
      return;
    }

    try {
      await createSubscription({
        companyId,
        plan: form.plan,
        products: form.products,
        autoRenew: form.autoRenew,
      });
      toast.success("Subscription created successfully");
      setShowModal(false);
      fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to create subscription");
    }
  };

  const handleToggleAutoRenew = async () => {
    if (!companySubscription) return;

    try {
      await updateSubscription(companySubscription.id, {
        autoRenew: !companySubscription.autoRenew,
      });
      toast.success("Auto-renew updated successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to update auto-renew");
    }
  };

  const handleToggleProduct = async (productType: string) => {
    if (!companySubscription) return;

    try {
      const updatedProducts = companySubscription.products.map((p) =>
        p.productType === productType ? { ...p, isEnabled: !p.isEnabled } : p
      );
      await updateSubscription(companySubscription.id, {
        products: updatedProducts,
      });
      toast.success("Product updated successfully");
      fetchData();
    } catch (error) {
      toast.error("Failed to update product");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
          <p className="text-gray-600 mt-1">Manage your subscription and product licenses</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <CreditCard size={20} />
          {companySubscription ? "Upgrade Plan" : "Subscribe Now"}
        </button>
      </div>

      {companySubscription && company ? (
        <div className="space-y-6">
          {/* Current Subscription Card */}
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{companySubscription.plan} Plan</h2>
                  <p className="text-indigo-100 text-sm">{company.name}</p>
                </div>
                <div className="text-white text-right">
                  <p className="text-sm text-indigo-100">Status</p>
                  <p className="text-lg font-semibold flex items-center gap-2">
                    {companySubscription.status === SubscriptionStatus.ACTIVE ? (
                      <>
                        <CheckCircle size={20} />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle size={20} />
                        {companySubscription.status}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Start Date</span>
                    <Calendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(companySubscription.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">End Date</span>
                    <Calendar className="h-4 w-4 text-red-600" />
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    {new Date(companySubscription.endDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-500">Auto-Renew</span>
                    <RefreshCw className="h-4 w-4 text-green-600" />
                  </div>
                  <button
                    onClick={handleToggleAutoRenew}
                    className={`text-sm font-medium ${
                      companySubscription.autoRenew ? "text-green-600" : "text-gray-600"
                    }`}
                  >
                    {companySubscription.autoRenew ? "Enabled" : "Disabled"}
                  </button>
                </div>
              </div>

              {/* Product Licenses */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Licenses</h3>
                <div className="grid grid-cols-3 gap-4">
                  {companySubscription.products.map((product) => (
                    <div
                      key={product.productType}
                      className={`border rounded-lg p-4 ${
                        product.isEnabled ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-900">{product.productType}</span>
                        <button
                          onClick={() => handleToggleProduct(product.productType)}
                          className={`p-1 rounded ${
                            product.isEnabled ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                          }`}
                        >
                          {product.isEnabled ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        </button>
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Usage</span>
                          <span>{product.currentUsage} / {product.usageLimit}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              (product.currentUsage / product.usageLimit) > 0.9
                                ? "bg-red-500"
                                : (product.currentUsage / product.usageLimit) > 0.7
                                ? "bg-yellow-500"
                                : "bg-green-500"
                            }`}
                            style={{
                              width: `${Math.min((product.currentUsage / product.usageLimit) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">
                        Status: {product.isEnabled ? "Active" : "Disabled"}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden p-8 text-center">
          <CreditCard className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Active Subscription</h3>
          <p className="text-gray-600 mb-4">Subscribe to access all features and start sending messages.</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Subscribe Now
          </button>
        </div>
      )}

      {/* Subscription Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">Choose Your Plan</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {["MONTHLY", "YEARLY"].map((plan) => (
                  <div
                    key={plan}
                    onClick={() => setForm({ ...form, plan: plan as any })}
                    className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                      form.plan === plan ? "border-indigo-500 bg-indigo-50" : "border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">{plan}</h4>
                      {form.plan === plan && <CheckCircle className="h-5 w-5 text-indigo-600" />}
                    </div>
                    <p className="text-sm text-gray-600">
                      {plan === "MONTHLY" ? "$29/month" : "$290/year (Save 17%)"}
                    </p>
                  </div>
                ))}
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">Product Licenses</h4>
                <div className="space-y-2">
                  {form.products.map((product) => (
                    <div key={product.productType} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={product.isEnabled}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              products: form.products.map((p) =>
                                p.productType === product.productType
                                  ? { ...p, isEnabled: e.target.checked }
                                  : p
                              ),
                            })
                          }
                          className="w-4 h-4 text-indigo-600"
                        />
                        <span className="text-sm font-medium text-gray-900">{product.productType}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Limit:</span>
                        <input
                          type="number"
                          value={product.usageLimit}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              products: form.products.map((p) =>
                                p.productType === product.productType
                                  ? { ...p, usageLimit: parseInt(e.target.value) }
                                  : p
                              ),
                            })
                          }
                          className="w-20 px-2 py-1 border rounded text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.autoRenew}
                  onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })}
                  className="w-4 h-4 text-indigo-600"
                />
                <span className="text-sm text-gray-700">Auto-renew subscription</span>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSubscription}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
