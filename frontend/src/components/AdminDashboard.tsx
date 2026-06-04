import React, { useState, useEffect } from "react";
import { Company, Subscription, ProductType, SubscriptionStatus } from "../types";

interface Props {
  user: any;
}

export default function AdminDashboard({ user }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [companiesRes, subscriptionsRes, notificationsRes] = await Promise.all([
        fetch("http://localhost:3200/api/companies"),
        fetch("http://localhost:3200/api/subscriptions"),
        fetch("http://localhost:3200/api/notifications"),
      ]);

      const companiesData = await companiesRes.json();
      const subscriptionsData = await subscriptionsRes.json();
      const notificationsData = await notificationsRes.json();

      setCompanies(companiesData);
      setSubscriptions(subscriptionsData);
      setNotifications(notificationsData);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleService = async (companyId: string, serviceType: ProductType, currentEnabled: boolean) => {
    try {
      const response = await fetch(`http://localhost:3200/api/companies/${companyId}/toggle-service`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          serviceType,
          enabled: !currentEnabled,
        }),
      });

      if (response.ok) {
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        alert(error.error || "Failed to toggle service");
      }
    } catch (error) {
      console.error("Error toggling service:", error);
      alert("Failed to toggle service");
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await fetch(`http://localhost:3200/api/notifications/${notificationId}/read`, {
        method: "PUT",
      });
      fetchData();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await fetch("http://localhost:3200/api/notifications/read-all", {
        method: "PUT",
      });
      fetchData();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const getSubscriptionForCompany = (companyId: string) => {
    return subscriptions.find((s) => s.companyId === companyId);
  };

  const getServiceStatus = (subscription: Subscription | undefined, serviceType: ProductType) => {
    if (!subscription) return { enabled: false, usage: 0, limit: 0 };
    const product = subscription.products?.find((p) => p.productType === serviceType);
    return {
      enabled: product?.isEnabled || false,
      usage: product?.currentUsage || 0,
      limit: product?.usageLimit || 0,
    };
  };

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case SubscriptionStatus.ACTIVE:
        return "bg-green-100 text-green-800";
      case SubscriptionStatus.EXPIRED:
        return "bg-red-100 text-red-800";
      case SubscriptionStatus.SUSPENDED:
        return "bg-yellow-100 text-yellow-800";
      case SubscriptionStatus.TRIAL:
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage companies and subscriptions</p>
        </div>
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-gray-600 hover:text-gray-900"
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-red-600 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Notifications</h3>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-indigo-600 hover:text-indigo-800"
                  >
                    Mark all as read
                  </button>
                )}
              </div>
              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="p-4 text-gray-500 text-center">No notifications</p>
                ) : (
                  notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${
                        !notification.isRead ? "bg-indigo-50" : ""
                      }`}
                      onClick={() => markNotificationAsRead(notification.id)}
                    >
                      <p className="font-medium text-gray-900">{notification.title}</p>
                      <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Companies Table */}
      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Companies</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subscription
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SMS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  WhatsApp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => {
                const subscription = getSubscriptionForCompany(company.id);
                const smsStatus = getServiceStatus(subscription, ProductType.SMS);
                const emailStatus = getServiceStatus(subscription, ProductType.EMAIL);
                const whatsappStatus = getServiceStatus(subscription, ProductType.WHATSAPP);

                return (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{company.name}</div>
                      <div className="text-sm text-gray-500">{company.contactEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                        {company.companyCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subscription ? (
                        <div>
                          <div className="text-sm text-gray-900">{subscription.plan}</div>
                          <div className="text-xs text-gray-500">
                            {new Date(subscription.endDate).toLocaleDateString()}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No subscription</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleService(company.id, ProductType.SMS, smsStatus.enabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            smsStatus.enabled ? "bg-indigo-600" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              smsStatus.enabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="ml-2 text-xs text-gray-500">
                          {smsStatus.usage}/{smsStatus.limit}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleService(company.id, ProductType.EMAIL, emailStatus.enabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            emailStatus.enabled ? "bg-indigo-600" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              emailStatus.enabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="ml-2 text-xs text-gray-500">
                          {emailStatus.usage}/{emailStatus.limit}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <button
                          onClick={() => toggleService(company.id, ProductType.WHATSAPP, whatsappStatus.enabled)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            whatsappStatus.enabled ? "bg-indigo-600" : "bg-gray-200"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              whatsappStatus.enabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <span className="ml-2 text-xs text-gray-500">
                          {whatsappStatus.usage}/{whatsappStatus.limit}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {subscription ? (
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                            subscription.status
                          )}`}
                        >
                          {subscription.status}
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          No subscription
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    No companies found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
