import asyncHandler from '../utils/asyncHandler.js';
import * as complaintService from '../services/complaintService.js';

/**
 * Administrator controllers.
 * Every route here is mounted behind `protect` + `adminOnly`, so `req.user`
 * is guaranteed to be an administrator.
 */

/** GET /api/admin/complaints - all complaints, searchable + filterable. */
export const listComplaints = asyncHandler(async (req, res) => {
  const { status, category, q, sort, page, limit } = req.query;

  const { items, meta } = await complaintService.listAllComplaints({
    status,
    category,
    q,
    sort,
    page,
    limit,
  });

  res.status(200).json({
    success: true,
    data: { complaints: items.map((item) => item.toJSON()), meta },
  });
});

/** GET /api/admin/complaints/:trackingId */
export const getComplaint = asyncHandler(async (req, res) => {
  const complaint = await complaintService.getComplaintForUser({
    user: req.user,
    trackingId: req.params.trackingId,
  });

  res.status(200).json({ success: true, data: { complaint: complaint.toJSON() } });
});

/**
 * PATCH /api/admin/complaints/:trackingId/status
 * Records the administrator identity + timestamp for every change.
 */
export const updateStatus = asyncHandler(async (req, res) => {
  const { status, note = '' } = req.body;

  const complaint = await complaintService.updateComplaintStatus({
    trackingId: req.params.trackingId,
    status,
    note,
    actor: req.user,
  });

  res.status(200).json({
    success: true,
    message: `${complaint.trackingId} updated to "${complaint.status}".`,
    data: { complaint: complaint.toJSON() },
  });
});

/** GET /api/admin/stats - summary cards for the admin dashboard. */
export const getStats = asyncHandler(async (_req, res) => {
  const stats = await complaintService.getAdminStats();
  res.status(200).json({ success: true, data: stats });
});
