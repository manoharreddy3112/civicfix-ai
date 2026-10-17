import asyncHandler from '../utils/asyncHandler.js';
import * as complaintService from '../services/complaintService.js';

/**
 * POST /api/complaints
 * Creates a complaint ONLY after the citizen explicitly confirmed the summary
 * produced by the chatbot. The body is re-validated here from scratch - the
 * frontend draft is never trusted.
 */
export const createComplaint = asyncHandler(async (req, res) => {
  const { category, description, location } = req.body;

  const complaint = await complaintService.createComplaint({
    citizen: req.user,
    draft: { category, description, location },
    source: req.body.source === 'form' ? 'form' : 'chatbot',
  });

  res.status(201).json({
    success: true,
    message: `Complaint submitted successfully. Your tracking ID is ${complaint.trackingId}.`,
    data: { complaint: complaint.toJSON() },
  });
});

/** GET /api/complaints - the authenticated citizen's own complaints. */
export const listMyComplaints = asyncHandler(async (req, res) => {
  const { status, category, q, page, limit } = req.query;

  const { items, meta } = await complaintService.listCitizenComplaints({
    citizenId: req.user._id,
    status,
    category,
    q,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: { complaints: items.map((item) => item.toJSON()), meta },
  });
});

/** GET /api/complaints/stats - dashboard summary cards + recent complaints. */
export const getMyStats = asyncHandler(async (req, res) => {
  const stats = await complaintService.getCitizenStats(req.user._id);
  res.status(200).json({ success: true, data: stats });
});

/** GET /api/complaints/:trackingId - details + full status history. */
export const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await complaintService.getComplaintForUser({
    user: req.user,
    trackingId: req.params.trackingId,
  });

  res.status(200).json({
    success: true,
    data: { complaint: complaint.toJSON() },
  });
});
