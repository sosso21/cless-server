const { pipeline } = require("nodemailer/lib/xoauth2");
const config = require("./config.json");
module.exports = {
  total: async (promo, typeDeliver, cart) =>
  {
    let ids = [];
    cart.map((i) => ids.push(i._id));

    const Products = await strapi.query("products").model.find(
      {
        _id: {
          $in: ids,
        },
      },
      ["_id", "price", "name"]
    );
    let allProducts = [];
    cart.map((i) =>
    {
      const { name, price, id, _id } = Products.filter(
        (p) => p._id == i._id
      )[0];
      if (name && price && id && _id)
      {
        allProducts.push({
          name,
          price,
          id,
          _id,
          model: i.model,
          quantity: i.count,
        });
      }
    });

    const userSold = await strapi.query("client").model.findOne({
      "promo.code": promo,
      "promo.value": 1,
    });

    const soldePromo = userSold != null ? userSold.promo.solde : 0;
    let totalMoney = 0;

    for (let i = 0; i < allProducts.length; i++)
    {
      const element = allProducts[i];
      const count = element.quantity;

      if (element.price[1] == false)
      {
        allProducts[i].price = {
          priceOriginal: element.price[0],

          toPay: Math.round(
            (element.price[0] - (element.price[0] * soldePromo) / 100) * count
          ),
        };
      } else
      {
        allProducts[i].price = {
          priceOriginal: element.price[0],

          toPay: Math.round(
            (element.price[0] -
              (element.price[0] * (element.price[1] + soldePromo)) / 100) *
            count
          ),
        };
      }
      totalMoney += allProducts[i].price.toPay;
    }

    const deliveries = {
      type: typeDeliver.name,
      price:(typeDeliver.FreeFrom != -1 && totalMoney > typeDeliver.FreeFrom ) ? 0 : typeDeliver.Price 
    };
    return {
      purshase: allProducts,
      deliveries: deliveries,
      totalMoney: totalMoney + deliveries.price,
    };
  },
};
