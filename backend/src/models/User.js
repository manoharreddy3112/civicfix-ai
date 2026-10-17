import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { ROLES, USER_ROLES } from '../config/constants.js';

const BCRYPT_ROUNDS = 12;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [80, 'Name cannot exceed 80 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [EMAIL_REGEX, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      // Never returned by default; must be explicitly requested with .select('+password')
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: USER_ROLES,
        message: `Role must be one of: ${USER_ROLES.join(', ')}`,
      },
      default: ROLES.CITIZEN,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret) => {
        delete ret.password;
        delete ret.__v;
        delete ret.id;
        return ret;
      },
    },
  }
);

/** Hash the password whenever it is created or changed. */
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
    return next();
  } catch (error) {
    return next(error);
  }
});

/** Compares a plain-text password against the stored bcrypt hash. */
userSchema.methods.comparePassword = function comparePassword(plainPassword) {
  if (!this.password) return Promise.resolve(false);
  return bcrypt.compare(plainPassword, this.password);
};

userSchema.methods.isAdmin = function isAdmin() {
  return this.role === ROLES.ADMIN;
};

const User = mongoose.model('User', userSchema);

export { ROLES, USER_ROLES, BCRYPT_ROUNDS };
export default User;
