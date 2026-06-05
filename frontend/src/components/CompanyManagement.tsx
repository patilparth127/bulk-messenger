import React, { useState, useEffect } from "react";
import { Building2, Plus, Edit, Trash2, Users, Mail, Phone, MapPin, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Company } from "../types";
import { getCompanies, createCompany, updateCompany, deleteCompany } from "../utils/api";

interface Props {
  user: any;
}

export default function CompanyManagement({ user }: Props) {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [form, setForm] = useState({
    name: "",
    domain: "",
    contactEmail: "",
    contactPhone: "",
    companyCode: "",
    address: {
      street: "",
      city: "",
      state: "",
      country: "",
      zipCode: "",
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    try {
      const data = await getCompanies();
      setCompanies(data);
    } catch (error) {
      toast.error("Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Company name is required";
    if (!form.contactEmail.trim()) e.contactEmail = "Contact email is required";
    if (!form.contactPhone.trim()) e.contactPhone = "Contact phone is required";
    if (!form.companyCode.trim()) e.companyCode = "Company code is required";
    if (form.companyCode.length < 3) e.companyCode = "Company code must be at least 3 characters";
    return e;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }

    try {
      if (editingCompany) {
        await updateCompany(editingCompany.id, form);
        toast.success("Company updated successfully");
      } else {
        await createCompany(form);
        toast.success("Company created successfully");
      }
      setShowModal(false);
      setEditingCompany(null);
      resetForm();
      fetchCompanies();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to save company");
    }
  };

  const handleEdit = (company: Company) => {
    setEditingCompany(company);
    setForm({
      name: company.name,
      domain: company.domain || "",
      contactEmail: company.contactEmail,
      contactPhone: company.contactPhone,
      companyCode: company.companyCode,
      address: company.address || {
        street: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
      },
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this company?")) return;
    try {
      await deleteCompany(id);
      toast.success("Company deleted successfully");
      fetchCompanies();
    } catch (error) {
      toast.error("Failed to delete company");
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      domain: "",
      contactEmail: "",
      contactPhone: "",
      companyCode: "",
      address: {
        street: "",
        city: "",
        state: "",
        country: "",
        zipCode: "",
      },
    });
    setErrors({});
  };

  const handleModalClose = () => {
    setShowModal(false);
    setEditingCompany(null);
    resetForm();
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
          <h1 className="text-3xl font-bold text-gray-900">Company Management</h1>
          <p className="text-gray-600 mt-1">Manage all companies in the system</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus size={20} />
          Add Company
        </button>
      </div>

      <div className="bg-white shadow-lg rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">All Companies</h2>
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
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 bg-indigo-100 rounded-full flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{company.name}</div>
                        {company.domain && (
                          <div className="text-sm text-gray-500">{company.domain}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                      {company.companyCode}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{company.contactEmail}</div>
                    <div className="text-sm text-gray-500">{company.contactPhone}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {company.isActive ? (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(company)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(company.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No companies found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black bg-opacity-50" onClick={handleModalClose} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-xl font-semibold text-gray-900">
                {editingCompany ? "Edit Company" : "Add New Company"}
              </h3>
              <button onClick={handleModalClose} className="text-gray-400 hover:text-gray-600">
                <XCircle size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Enter company name"
                  />
                  {errors.name && <span className="form-error">{errors.name}</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Code *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.companyCode}
                    onChange={(e) => setForm({ ...form, companyCode: e.target.value.toUpperCase() })}
                    placeholder="Enter company code"
                  />
                  {errors.companyCode && <span className="form-error">{errors.companyCode}</span>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Domain
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={form.domain}
                  onChange={(e) => setForm({ ...form, domain: e.target.value })}
                  placeholder="example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Email *
                  </label>
                  <input
                    type="email"
                    className="form-input"
                    value={form.contactEmail}
                    onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    placeholder="contact@company.com"
                  />
                  {errors.contactEmail && <span className="form-error">{errors.contactEmail}</span>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contact Phone *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    value={form.contactPhone}
                    onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                    placeholder="+1234567890"
                  />
                  {errors.contactPhone && <span className="form-error">{errors.contactPhone}</span>}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <h4 className="text-sm font-medium text-gray-700 mb-3">Address</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.address.street}
                      onChange={(e) => setForm({ ...form, address: { ...form.address, street: e.target.value } })}
                      placeholder="123 Main St"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.address.city}
                      onChange={(e) => setForm({ ...form, address: { ...form.address, city: e.target.value } })}
                      placeholder="New York"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.address.state}
                      onChange={(e) => setForm({ ...form, address: { ...form.address, state: e.target.value } })}
                      placeholder="NY"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.address.country}
                      onChange={(e) => setForm({ ...form, address: { ...form.address, country: e.target.value } })}
                      placeholder="USA"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={form.address.zipCode}
                      onChange={(e) => setForm({ ...form, address: { ...form.address, zipCode: e.target.value } })}
                      placeholder="10001"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  {editingCompany ? "Update Company" : "Create Company"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
