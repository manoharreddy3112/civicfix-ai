import asyncHandler from '../utils/asyncHandler.js';
import { handleChatMessage } from '../services/chatService.js';
import { currentAiMode, AI_MODES, DEMO_NOTICE, emptyDraft } from '../services/aiService.js';
import { COMPLAINT_CATEGORIES, COMPLAINT_STATUSES } from '../config/constants.js';

/**
 * POST /api/chat/message
 * Body: { message: string, history?: [{role, content}], draft?: {category, description, location} }
 *
 * The backend is stateless about the conversation: the client echoes back the
 * draft and the recent history, which keeps the API simple and horizontally
 * scalable. All complaint records still live only in MongoDB.
 */
export const sendMessage = asyncHandler(async (req, res) => {
  const { message, history = [], draft = null } = req.body;

  const result = await handleChatMessage({
    user: req.user,
    message,
    history,
    draft,
  });

  res.status(200).json({ success: true, data: result });
});

/** GET /api/chat/mode - lets the UI show an honest "Demo mode" badge. */
export const getMode = asyncHandler(async (_req, res) => {
  const aiMode = currentAiMode();
  res.status(200).json({
    success: true,
    data: {
      aiMode,
      isDemoMode: aiMode === AI_MODES.DEMO,
      notice: aiMode === AI_MODES.DEMO ? DEMO_NOTICE : null,
      categories: COMPLAINT_CATEGORIES,
      statuses: COMPLAINT_STATUSES,
    },
  });
});

/** GET /api/chat/greeting - the opening assistant message. */
export const getGreeting = asyncHandler(async (req, res) => {
  const aiMode = currentAiMode();
  const firstName = req.user.name.split(' ')[0];

  res.status(200).json({
    success: true,
    data: {
      reply: `Hello ${firstName}! I'm CivicFix AI. Describe a public problem you've noticed - for example "there's a large pothole on Main Street" - and I'll file a complaint for you. You can also send a tracking ID to check an existing complaint.`,
      aiMode,
      isDemoMode: aiMode === AI_MODES.DEMO,
      notice: aiMode === AI_MODES.DEMO ? DEMO_NOTICE : null,
      draft: emptyDraft(),
      missingFields: [],
      readyToSubmit: false,
      intent: 'greeting',
      complaint: null,
    },
  });
});
