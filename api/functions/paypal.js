const paypal = require('paypal-rest-sdk');
const config = require('./config.json')
module.exports = {
  // connect
  createPayment: async ( sku ,totalToPay ,name) => {

    paypal.configure({
      mode: "sandbox", //sandbox or live
      client_id: config.paypal.id,
      client_secret: config.paypal.secret,
    });

    const create_payment_json = {
      intent: "sale",
      payer: {
        payment_method: "paypal",
      },
      redirect_urls: {
        return_url: config.urlAPI + "/api/paymentSuccess", 
        cancel_url: config.urlAPI + "/api/paymentFail",
      },
      transactions: [{
        item_list: {
          items: [{
            name: name, //cha,ger
            sku:sku, //changer
            price: totalToPay, // changer
            currency: config.paypal.currency,
            quantity: 1 ,
          }, ],
        },
        amount: {
          currency: config.paypal.currency,
          total: totalToPay, //changer
        },
        description: "Merci a vous de commander sur notre site.", //changer
      }, ],
    };


    
    const cretePaypalPaument = () => {
      return new Promise((resolve, reject) => {
        paypal.payment.create(create_payment_json, (error, payment) => {
          if (error) {
            //AXCODE
            reject(error);
          } else {  
            payment.links.map(link => {
              if (link.rel == "approval_url") {

                resolve({id:payment.id,link : link.href})
              }
            })
          }
        });
      });
    }

    try {
      const link = await cretePaypalPaument();

      return link
    } catch (err) {

      return {
        error: "Internal Server Error"
      };
    }
    },
    executePayment :async (query,toPay)=>{
        
    const execute_payment = {
        "payer_id":query.PayerID,
        "transactions":[{
            "amount":{
                "currency":config.paypal.currency,
                "total":toPay
            }
        }]
    }
    
    const execute = async() => {
      return new Promise((resolve, reject) => {
    paypal.payment.execute(query.paymentId,execute_payment,(err,payment)=>{
      if(err){
        reject(err)
      }else{
        resolve(payment)
      }
    })
      })
    }
    
    try {
        const reset = await execute()
        return reset
      } catch (err) {
  
        return {
          error: "Internal Server Error"
        };
      }
    }

  }
