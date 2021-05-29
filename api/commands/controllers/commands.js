const fs = require("fs");
const sendEmail = require("../../functions/sendEmail.js");
const setPaypal = require("../../functions/paypal.js");
const somme = require("../../functions/somme.js");
const jwt_utils = require("../../functions/jwt.utils")
const config = require('../../functions/config.json')
module.exports = {
  // payment Create link
  payment: async (ctx) => {
    
    const promo = ctx.request.body.promo;
    const cart = JSON.parse(ctx.request.body.cart);
    const token =ctx.request.body.token;
    const auth = jwt_utils.getUserInfo(token);  
     const typeDeliver = await strapi.query("deliver").model.findOne({_id:ctx.request.body.typeDeliver});

    if(cart.length == 0){
      return ctx.send({error:"le panier est vide"})
    }
    if(typeDeliver== undefined ){
      return ctx.send({error:"error, réesayer plus tard"})
    }
let userClient = {};
if(auth !=-1){
  userClient = await strapi.query("client").model.findOne({
  _id : auth.userId
  })
}
    const total = await somme.total(promo, typeDeliver, cart);
  const newCommands = await strapi.query("commands").create({
        purshase: total.purshase,
        code_promo:promo ? promo : "",
    email: userClient.email ? userClient.email : "",
    user_id:userClient._id ? userClient._id : "",
    typeDeliver: typeDeliver ? typeDeliver : "" ,
    money: total.totalMoney
     });
     
     let names = "";
for (let i = 0; i < newCommands.purshase.length; i++) {
  const element = newCommands.purshase[i];
  names += element.name+", "
}
names += " Livraison " + typeDeliver.name


     const createPayment = await setPaypal.createPayment( newCommands._id ,newCommands.money,names);
      await strapi.query("commands").update(
      { 
        _id: newCommands._id 
      },{
    "payment_Id":  createPayment.id
      }
    );
    
    return ctx.send(createPayment);
  
  },
  /// on success payment
  paymentSuccess: async (ctx) => {
   const command=await strapi.query("commands").findOne(
      { 
        payment_Id:ctx.query.paymentId
      }
    );
     
    const executePayment = await setPaypal.executePayment(ctx.query,command.money);
if(executePayment.state== "approved"){

   await strapi.query("commands").update(
    { 
      payment_Id:ctx.query.paymentId
    },{
        email: command.email ? command.email : executePayment.payer.payer_info.email ,
        adress: executePayment.payer.payer_info.shipping_address ,
        payed : true
      }
      );


        fs.readFile(
        __dirname + "/../../functions/templateEmail/confirmationCommands.txt",
        "utf-8",
        (err, data) => {
          data = data
            .split(" %comandeId%")
            .join(command._id)
            .split("%paymentID%")
            .join(ctx.query.paymentId)
            .split("%link%")
            .join(config.urlClient);
            const email =command.email ? command.email : executePayment.payer.payer_info.email 
          return sendEmail(email, "Merci d'avoir commander sur notre boutique ", data);
        }
      );
      
      ctx.redirect(config.urlClient+"?set=clearCart")
    }else{
      ctx.redirect(config.urlAPI+"//api/paymentFail")
    }
  },
  paymentFail: async (ctx) => {
    ctx.send(`<h1 align='center'>Erreur de paiment veuillez réesayer ou nous contacter</h1> <br> <a href="${config.urlClient}">Retour</a> ` );

  },
};
