import { validationResult } from 'express-validator';
import ApiError from '../utils/ApiError.js';

/**
 * Turns express-validator results into a single 400 ApiError with a
 * field-keyed `details` array the frontend can render inline.
 */
export function validate(req, _res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const details = result.array().map((error) => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value,
  }));

  // A readable top-level message for toast notifications.
  const first = details[0];
  const message = first ? `${first.field}: ${first.message}` : 'Validation failed';

  return next(ApiError.badRequest(message, details));
}

export default validate;
