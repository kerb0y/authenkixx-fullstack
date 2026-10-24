/*
Joi schema validation for the prototype API.

Invalid input returns 400 with a clear message; it never crashes
the server and never writes partial data.
*/
const Joi = require("joi");

const availabilityValues = ["tersedia", "menipis", "habis"];

const productSchema = Joi.object({
  name: Joi.string().trim().min(3).max(120).required(),
  price: Joi.number().positive().required(),
  stock: Joi.number().integer().min(0).required(),
  availability: Joi.string().valid(...availabilityValues).required(),
  channels: Joi.array().items(Joi.string().trim().min(1)).default([]),
});

const productUpdateSchema = Joi.object({
  name: Joi.string().trim().min(3).max(120),
  price: Joi.number().positive(),
  stock: Joi.number().integer().min(0),
  availability: Joi.string().valid(...availabilityValues),
  channels: Joi.array().items(Joi.string().trim().min(1)),
}).min(1);

const stockMovementSchema = Joi.object({
  type: Joi.string().valid("in", "out").required(),
  quantity: Joi.number().integer().min(1).required(),
  note: Joi.string().trim().max(200).allow("").default(""),
});

const aiChatSchema = Joi.object({
  message: Joi.string().trim().min(1).max(500).required(),
});

function validate(schema, body) {
  const { error, value } = schema.validate(body, { abortEarly: false });
  if (error) {
    return {
      ok: false,
      message: error.details.map((d) => d.message).join("; "),
    };
  }
  return { ok: true, value };
}

function availabilityForStock(stock) {
  if (stock === 0) return "habis";
  if (stock <= 5) return "menipis";
  return "tersedia";
}

module.exports = {
  productSchema,
  productUpdateSchema,
  stockMovementSchema,
  aiChatSchema,
  validate,
  availabilityForStock,
};
