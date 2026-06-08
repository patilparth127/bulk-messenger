import React, { useState, useEffect } from "react";
import { Building2, Users, Mail, MessageCircle, TrendingUp, Calendar, Activity, Settings } from "lucide-react";
import toast from "react-hot-toast";
import { Company, Subscription, Contact, EmailCampaign, WhatsAppCampaign } from "../types";
import { getCompany, getCompanySubscription, getContacts, getEmailCampaigns, getWhatsAppCampaigns } from "../utils/api";

interface Props {
  companyId: string;
  user: any;
}

export default function CompanyDashboard({ companyId, user }: Props) {
  const [company, setCompany] = useState<Company | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [emailCampaigns, setEmailCampaigns] = useState<EmailCampaign[]>([]);
  const [whatsappCampaigns, setWhatsAppCampaigns] = useState<WhatsAppCampaign[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompanyData();
  }, [companyId]);

  const fetchCompanyData = async () => {
    try {
      const [companyData, subscriptionData] = await Promise.all([
        getCompany(companyId),
        getCompanySubscription(companyId),
      ]);
      setCompany(companyData);
      setSubscription(subscriptionData);

      // Fetch company-specific data
      const [contactsData, emailData, whatsappData] = await Promise.all([
        getContacts(),
        getEmailCampaigns(),
        getWhatsAppCampaigns(),
      ]);

      // Filter data for this company (in a real app, this would be done on the backend)
      setContacts(contactsData);
      setEmailCampaigns(emailData);
      setWhatsAppCampaigns(whatsappData);
    } catch (error) {
      toast.error("Failed to fetch company data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Company not found</div>
      </div>
    );
  }

  const totalContacts = contacts.length;
  const totalEmailCampaigns = emailCampaigns.length;
  const totalWhatsAppCampaigns = whatsappCampaigns.length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Company Header */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-white bg-opacity-20 rounded-full p-4 mr-4">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">{company.name}</h1>
                <p className="text-indigo-100 text-sm">{company.companyCode}</p>
              </div>
            </div>
            <div className="text-white text-right">
              <p className="text-sm text-indigo-100">Status</p>
              <p className="text-lg font-semibold">
                {company.isActive ? "Active" : "Inactive"}
              </p>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Contact Email</p>
              <p className="font-medium text-gray-900">{company.contactEmail}</p>
            </div>
            <div>
              <p className="text-gray-500">Contact Phone</p>
              <p className="font-medium text-gray-900">{company.contactPhone}</p>
            </div>
            <div>
              <p className="text-gray-500">Domain</p>
              <p className="font-medium text-gray-900">{company.domain || "N/A"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Status */}
      {subscription && (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Subscription Status</h2>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Plan</span>
                  <Activity className="h-4 w-4 text-indigo-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">{subscription.plan}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Status</span>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-gray-900">{subscription.status}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Start Date</span>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(subscription.startDate).toLocaleDateString()}
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">End Date</span>
                  <Calendar className="h-4 w-4 text-red-600" />
                </div>
                <p className="text-sm font-medium text-gray-900">
                  {new Date(subscription.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Product Licenses */}
            {subscription.products && subscription.products.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Product Licenses</h3>
                <div className="grid grid-cols-3 gap-4">
                  {subscription.products.map((product) => (
                    <div
                      key={product.productType}
                      className={`border rounded-lg p-4 ${
                        product.isEnabled ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-900">{product.productType}</span>
                        {product.isEnabled ? (
                          <span className="text-green-600 text-xs">Enabled</span>
                        ) : (
                          <span className="text-red-600 text-xs">Disabled</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500">
                        Usage: {product.currentUsage} / {product.usageLimit}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-100 rounded-full p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{totalContacts}</span>
          </div>
          <p className="text-sm text-gray-500">Total Contacts</p>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-indigo-100 rounded-full p-3">
              <Mail className="h-6 w-6 text-indigo-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{totalEmailCampaigns}</span>
          </div>
          <p className="text-sm text-gray-500">Email Campaigns</p>
        </div>
        <div className="bg-white shadow-lg rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <MessageCircle className="h-6 w-6 text-green-600" />
            </div>
            <span className="text-2xl font-bold text-gray-900">{totalWhatsAppCampaigns}</span>
          </div>
          <p className="text-sm text-gray-500">WhatsApp Campaigns</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <Users className="h-8 w-8 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Manage Contacts</span>
            </button>
            <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <Mail className="h-8 w-8 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Send Email</span>
            </button>
            <button className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors">
              <MessageCircle className="h-8 w-8 text-indigo-600 mb-2" />
              <span className="text-sm font-medium text-gray-700">Send WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
