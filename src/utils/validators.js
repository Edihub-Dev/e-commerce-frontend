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
  mobile: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.empty": "Mobile number is required",
      "string.pattern.base":
        "Enter a valid 10-digit Indian mobile number starting with 6-9",
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

export const sellerSignupSchema = Joi.object({
  fullName: Joi.string().min(3).max(120).required().messages({
    "string.empty": "Full name is required",
    "string.min": "Full name must be at least 3 characters",
    "string.max": "Full name cannot exceed 120 characters",
  }),
  companyName: Joi.string().min(2).max(150).required().messages({
    "string.empty": "Company name is required",
    "string.min": "Company name must be at least 2 characters",
    "string.max": "Company name cannot exceed 150 characters",
  }),
  companyEmail: Joi.string()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.empty": "Company email is required",
      "string.email": "Please enter a valid company email",
    }),
  contactNumber: Joi.string()
    .pattern(/^[6-9]\d{9}$/)
    .required()
    .messages({
      "string.pattern.base": "Please enter a valid 10-digit mobile number",
      "string.empty": "Company contact number is required",
    }),
  gstNumber: Joi.string()
    .allow("", null)
    .pattern(/^[0-9A-Z]{15}$/)
    .messages({
      "string.pattern.base": "GST number must be 15 characters (alphanumeric)",
    }),
  location: Joi.string().min(3).max(200).required().messages({
    "string.empty": "Location is required",
    "string.min": "Location must be at least 3 characters",
    "string.max": "Location cannot exceed 200 characters",
  }),
  password: strongPassword,
  confirmPassword: Joi.any().valid(Joi.ref("password")).required().messages({
    "any.only": "Passwords do not match",
    "any.required": "Please confirm your password",
  }),
});
