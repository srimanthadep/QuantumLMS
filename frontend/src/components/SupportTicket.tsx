import React, { useState, useEffect, useCallback } from "react";
import {
  createTicket,
  getStudentTickets,
  subscribeToTickets,
  type CreateTicketInput,
  type SupportTicket as SupportTicketType,
} from "../services/ticketService";
import { RefreshCw, Paperclip, Clock, CheckCircle, AlertCircle } from "lucide-react";

const SupportTicket: React.FC = () => {
  const [form, setForm] = useState<CreateTicketInput>({
    category: "",
    subject: "",
    description: "",
    priority: "Low",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Student tickets state
  const [tickets, setTickets] = useState<SupportTicketType[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(true);
  const [ticketsError, setTicketsError] = useState<string | null>(null);

  const loadTickets = useCallback(async () => {
    setIsLoadingTickets(true);
    setTicketsError(null);
    try {
      const data = await getStudentTickets();
      setTickets(data);
    } catch (err) {
      setTicketsError(
        err instanceof Error ? err.message : "Failed to load support tickets."
      );
    } finally {
      setIsLoadingTickets(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
    const unsubscribe = subscribeToTickets(() => {
      loadTickets();
    });
    return () => {
      unsubscribe();
    };
  }, [loadTickets]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const newTicket = await createTicket(form);

      setMessage({
        type: "success",
        text: `Ticket created successfully! Ticket ID: ${newTicket.id}`,
      });

      setForm({
        category: "",
        subject: "",
        description: "",
        priority: "Low",
      });

      // Refresh tickets list
      await loadTickets();
    } catch (error) {
      setMessage({
        type: "error",
        text: error instanceof Error ? error.message : "Unable to create ticket.",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: SupportTicketType["status"]) => {
    switch (status) {
      case "Open":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "In Progress":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Resolved":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Closed":
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  const getPriorityBadge = (priority: SupportTicketType["priority"]) => {
    switch (priority) {
      case "Urgent":
        return "bg-rose-100 text-rose-800 border-rose-200 font-bold";
      case "High":
        return "bg-orange-100 text-orange-800 border-orange-200 font-bold";
      case "Medium":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Low":
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-8">
      {/* 1. Ticket Creation Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/80 p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-zinc-900 mb-2">
          Create Support Ticket
        </h2>
        <p className="text-sm text-zinc-500 mb-6">
          Submit an inquiry or technical issue to the QuantumLMS support desk.
        </p>

        {message && (
          <div
            className={`p-4 rounded-xl text-sm mb-6 flex items-start gap-2.5 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-900 border border-emerald-200"
                : "bg-rose-50 text-rose-900 border border-rose-200"
            }`}
            role="status"
          >
            {message.type === "success" ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block mb-1.5 text-sm font-semibold text-zinc-800">
              Category
            </label>
            <select
              name="category"
              value={form.category}
              onChange={handleChange}
              required
              className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="">Select Category</option>
              <option value="Login & Account">Login & Account</option>
              <option value="Live Class">Live Class</option>
              <option value="Assignments & Exams">Assignments & Exams</option>
              <option value="Course Content">Course Content</option>
              <option value="Technical Problem">Technical Problem</option>
              <option value="Payments & Certificates">Payments & Certificates</option>
              <option value="Notifications">Notifications</option>
              <option value="Others">Others</option>
            </select>
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-zinc-800">
              Subject
            </label>
            <input
              type="text"
              name="subject"
              value={form.subject}
              onChange={handleChange}
              minLength={8}
              maxLength={200}
              placeholder="Enter ticket subject (min 8 characters)"
              required
              className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block mb-1.5 text-sm font-semibold text-zinc-800">
              Description
            </label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              minLength={20}
              maxLength={5000}
              rows={4}
              placeholder="Describe your issue with sufficient detail (min 20 characters)..."
              required
              className="w-full border border-zinc-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>


          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {loading ? "Submitting Ticket..." : "Submit Ticket"}
          </button>
        </form>
      </div>

      {/* 2. Real-time Student Tickets History */}
      <div className="bg-white rounded-2xl shadow-sm border border-zinc-200/80 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-zinc-900">Your Support Tickets</h3>
            <p className="text-xs text-zinc-500">Live records from Supabase database</p>
          </div>
          <button
            onClick={loadTickets}
            disabled={isLoadingTickets}
            className="p-2 text-zinc-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors cursor-pointer"
            title="Refresh tickets"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingTickets ? "animate-spin" : ""}`} />
          </button>
        </div>

        {isLoadingTickets && tickets.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-sm">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-purple-600" />
            Loading your tickets from database...
          </div>
        ) : ticketsError ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 text-sm flex items-center justify-between">
            <span>{ticketsError}</span>
            <button
              onClick={loadTickets}
              className="font-bold underline hover:text-rose-950 cursor-pointer text-xs"
            >
              Retry
            </button>
          </div>
        ) : tickets.length === 0 ? (
          <div className="py-10 text-center text-zinc-400 text-sm border border-dashed border-zinc-200 rounded-xl">
            No support tickets submitted yet. Use the form above to open a ticket.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {tickets.map((t) => (
              <div key={t.id} className="py-4 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                      {t.id}
                    </span>
                    <span className="text-xs text-zinc-500 font-medium">{t.category}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getPriorityBadge(t.priority)}`}>
                      {t.priority}
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(t.status)}`}>
                      {t.status}
                    </span>
                  </div>
                </div>

                <h4 className="font-bold text-sm text-zinc-900">{t.subject}</h4>
                <p className="text-xs text-zinc-600 leading-relaxed">{t.description}</p>

                {t.attachment_name && (
                  <div className="flex items-center gap-1.5 text-xs text-purple-700 font-medium">
                    <Paperclip className="w-3.5 h-3.5" />
                    <span>{t.attachment_name}</span>
                    {t.attachment_size && (
                      <span className="text-zinc-400">({t.attachment_size})</span>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between pt-1 text-[11px] text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>Created: {new Date(t.created_at).toLocaleString()}</span>
                  </div>
                  {t.last_update_by && (
                    <span>Last update by: {t.last_update_by}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupportTicket;
