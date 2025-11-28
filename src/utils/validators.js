import Joi from "joi";

export const strongPassword = Joi.string()
  .pattern(/^(?=.{8,}$)(?=.*\d)(?=.*[^A-Za-z0-9])[A-Z][^\s]{7,}$/)
  .messages({
    "string.empty": "Password is required",
    "string.pattern.base":
      "Password must be at least 8 characters, start with an uppercase letter, and include at least one number and symbol",
  });

export const signupSchema = Joi.object({
  username: Joi.string().min(3).max(30).required().messages({
    "string.empty": "Username is required",
    "string.min": "Username must be at least 3 characters long",
    "string.max": "Username cannot be more than 30 characters long",
  }),
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email address",
    }),
  password: strongPassword,
  confirmPassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your password",
  }),
});

export const loginSchema = Joi.object({
  email: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Email is required",
      "string.email": "Please enter a valid email address",
    }),
  password: Joi.string().required().messages({
    "string.empty": "Password is required",
  }),
});
