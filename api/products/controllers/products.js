"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

const jwt_utils = require("../../functions/jwt.utils.js");

module.exports = {
  find: async (ctx) => {
    const products = await strapi
      .query("products")
      .model.find({}, [
        "name",
        "description",
        "price",
        "image",
        "type",
        "models",
      ]);

    const deliver = await strapi.query("deliver").model.find({});

    ctx.send({
      products: products,
      deliver: deliver,
    });
  },
  findOne: async (ctx) => {
    const result = await strapi.query("products").model.findOne(
      {
        _id: ctx.params.id,
      },
      ["name", "description", "price", "image", "type", "models"]
    );

    ctx.send(result);
  },
  uploadProduct: async (ctx) => {
    const disconnect = () => {
      return ctx.send({
        error: "disconnect",
      });
    };

    const token = ctx.request.body.token;

    const decode_token = await jwt_utils.getUserInfo(token);
    if (decode_token == -1) {
      return disconnect();
    }

    const adminExist = await strapi.query("client").findOne({
      _id: decode_token.userId,
      isAdmin: 1,
    });
    if (adminExist) {
      const newProduct = await strapi.query("products").create({
        name: ctx.request.body.name,
        description: ctx.request.body.description,
        price: JSON.parse(ctx.request.body.price),
        image: JSON.parse(ctx.request.body.image),
        type: JSON.parse(ctx.request.body.type),
        models: JSON.parse(ctx.request.body.models),
        note: ctx.request.body.note
      });
      
      if (newProduct) {
        return ctx.send({ success: newProduct });
      } else {
        return ctx.send({ error: "error" });
      }
    } else {
      return disconnect();
    }
  },
};
