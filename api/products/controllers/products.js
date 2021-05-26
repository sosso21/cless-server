'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 */

module.exports = {
    find: async(ctx)=>{
        const result = await strapi.query("products").model.find({}, ["name",
            "description",
            "price",
            "image",
            "type",
            "models"]);
            
        ctx.send(result)

    },
    findOne : async(ctx)=>{
        
        const result = await strapi.query("products").model.findOne({
            _id:ctx.params.id
        }, ["name",
            "description",
            "price",
            "image",
            "type",
            "models"]);
            
        ctx.send(result)

    }
};