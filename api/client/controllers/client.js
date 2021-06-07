"use strict";

/**
 * Read the documentation (https://strapi.io/documentation/v3.x/concepts/controllers.html#core-controllers)
 * to customize this controller
 
 */

/*
npm i -S  fs
npm i -S  email-deep-validator

npm i -S  bcrypt
npm i -S  password-validator
npm i -S  jsonwebtoken
npm i -S  paypal-rest-sdk
npm i -S  nodemailer 
*/
const {
  verifyEmail,
  verifyPass,
  verifyName,
} = require("../../functions/emailPassVerificator.js");
const sendEmail = require("../../functions/sendEmail.js");
const jwt_utils = require("../../functions/jwt.utils.js");
const fs = require("fs");
const bcrypt = require("bcrypt");

const sendMeEmailToConfirm = (firstname, lastname, token, email) => {
  fs.readFile(
    __dirname + "/../../functions/templateEmail/confirmationReegister.txt",
    "utf-8",
    (err, data) => {
      data = data
        .split("%firstname%")
        .join(firstname)
        .split("%lastname%")
        .join(lastname)
        .split("%linkAPI%")
        .join(config.urlAPI)
        .split("%token%")
        .join(token);
      return sendEmail(email, "Confirmez Votre Email", data);
    }
  );
};
const config = require("../../functions/config.json");

module.exports = {
  // connect
  connect: async (ctx) => {
    const ISO = ctx.request.header["user-agent"];
    const error = (error = "email/mot de passe incorrecte") => {
      ctx.send({
        error: error,
      });
    };

    const success = (infoUser) => {
      const token = jwt_utils.generateTokenForUser(infoUser, 3600 * 24 * 90, {
        ISO: ISO,
      });
      

      ctx.send({
        token: token,
        userInfo: {
          _id: infoUser._id,
          firstname: infoUser.firstname,
          lastname: infoUser.lastname,
          email: infoUser.email,
          phone: infoUser.phone,
          addr: infoUser.addr,
          promo: infoUser.promo,
          isAdmin: infoUser.isAdmin,
        },
      });
    };

    if (
      ctx.request.body.email != undefined &&
      ctx.request.body.pass != undefined
    ) {
      const email = ctx.request.body.email.toLowerCase();
      const pass = ctx.request.body.pass;
      const infoUser = await strapi.query("client").findOne({
        email: email,
      });
      
      if (infoUser == null) {
        return error();
      }

      const correct = await bcrypt.compare(pass, infoUser.pass);
      if (correct) {
        if (infoUser.isAdmin == -1) {
          return error(-1);
        }

        return success(infoUser);
      } else {
        return error();
      }
    } else if (ctx.request.body.token != undefined) {
      
      const decodeToken = jwt_utils.getUserInfo(
        ctx.request.body.token
      );
      if (decodeToken != -1 && decodeToken.ISO == ISO) {
        const infouser = await strapi.query("client").findOne({
          _id: decodeToken.userId,
          isAdmin_gt: -1,
        });

        if (infouser == null) {
          return error("disconnect");
        }
        return success(infouser);
      } else {
        return error("disconnect");
      }
    } else {
      return error("error");
    }
  },

  // inscription
  subscribe: async (ctx) => {
    const firstname = ctx.request.body.firstname;
    const lastname = ctx.request.body.lastname;
    const email = ctx.request.body.email.toLowerCase();
    const pass = ctx.request.body.pass;
    ctx.request.body.pass = await bcrypt.hash(pass, 10);

    if (!verifyName(firstname) || !verifyName(lastname)) {
      return ctx.send({
        error: "le nom et le prénom doit contenir entre 2 et 30 caractères ",
      });
    }
    if (!verifyEmail(email)) {
      return ctx.send({
        error: "email invalide ",
      });
    }
    if (!verifyPass(pass)) {
      return ctx.send({
        error:
          "le mot de passe doit contenir au moin : 8 caractàres , une majuscule ,une minuscule et 2 chiffres",
      });
    }
    const exist = await strapi.query("client").find({
      email: email,
    });
    if (exist.length != 0) {
      return ctx.send({
        error: `cet email est déjà existant`,
      });
    }

    const savedUser = await strapi.query("client").create(ctx.request.body);

    const token = jwt_utils.generateTokenForUser(savedUser, 60 * 15);

    sendMeEmailToConfirm(firstname, lastname, token, email);

    ctx.send({
      success: `un email de confirmation a été envoyer  à ${email}`,
    });
  },

  // confirm email
  confirmEmailGet: async (ctx) => {
    const token = ctx.params.token;
    const auth = jwt_utils.getUserInfo(token);

    if (auth != -1) {
      let authUser = await strapi.query("client").findOne({
        _id: auth.userId,
      });
      if (authUser == null) {
        return ctx.send("<h1>error link</h1>");
      }
      if (auth.email != undefined) {
        authUser.email = auth.email;
        await strapi.query("client").update(
          {
            _id: auth.userId,
          },
          authUser
        );

        authUser.isAdmin = 0;
        await strapi.query("client").update(
          {
            _id: auth.userId,
            isAdmin: -1,
          },
          authUser
        );
        ctx.redirect(config.urlClient + "/");
      } else {
        authUser.isAdmin = 0;
        await strapi.query("client").update(
          {
            _id: auth.userId,
          },
          authUser
        );
        ctx.redirect(config.urlClient + "/login");
      }
    } else {
      ctx.send("<h1> :le lien a expirer</h1>");
    }
  },

  // send email to confirm
  sendEmailToConfirm: async (ctx) => {
    const email = ctx.request.body.email;
    let auth = "";
    if (ctx.request.body.authorization) {
      auth = jwt_utils.getUserInfo(ctx.request.body.authorization);
      if (auth == -1) {
        return ctx.send({
          error: "token expired",
        });
      }
    } else {
      const user = await strapi.query("client").findOne({
        email: email,
      });

      auth = {
        _id: user._id,
        isAdmin: user.isAdmin,
      };
      if (user.length == 0) {
        return ctx.send({
          error: "error",
        });
      }
    }

    const token = await jwt_utils.generateTokenForUser(auth, 60 * 15, {
      email: email,
    });

    sendMeEmailToConfirm("Cher client", " ", token, email);
    ctx.send({
      success: `un email de confirmation a été envoyer  à ${email}`,
    });
  },

  // send email to reset password
  sendEmailToResetPassword: async (ctx) => {
    const email = ctx.request.body.email;
    const infoUser = await strapi.query("client").findOne({
      email: email,
    });
    if (infoUser != null) {
      const token = await jwt_utils.generateTokenForUser(
        {
          _id: infoUser._id,
          isAdmin: infoUser.isAdmin,
        },
        60 * 15
      );

      fs.readFile(
        __dirname + "/../../functions/templateEmail/mpmissing.txt",
        "utf-8",
        (err, data) => {
          data = data
            .split("%firstnam%")
            .join(infoUser.firstname)
            .split("%lastnam%")
            .join(infoUser.lastname)
            .split("%linkClient%")
            .join(config.urlClient)
            .split("%toke%")
            .join(token);
          sendEmail(email, "Réinitialiser Votre mot de passe", data);
        }
      );
      ctx.send({
        response: "success",
      });
    } else {
      ctx.send({
        response: "vous n'êtes pas inscrit grace à cet email",
      });
    }
  },

  // reset forget password
  resetForgetPassword: async (ctx) => {
    const token = ctx.request.body.authorization;
    const pass = ctx.request.body.pass;
    const decodeToken = await jwt_utils.getUserInfo(token);

    if (decodeToken != -1) {
      if (!verifyPass(pass)) {
        return ctx.send({
          response:
            "le mot de passe doit contenir au moin : 8 caractàres , une majuscule ,une minuscule et 2 chiffres",
        });
      } else {
        const hashPassword = await bcrypt.hash(pass, 10);
        let updateUser = await strapi.query("client").findOne({
          _id: decodeToken.userId,
        });
        updateUser.pass = hashPassword;
        await strapi.query("client").update(
          {
            _id: decodeToken.userId,
          },
          updateUser
        );
        return ctx.send({
          response: "success",
        });
      }
    } else {
      return ctx.send({
        response: "le lien a expirer.",
      });
    }
  },

  // update info
  updateInfo: async (ctx) => {
    const success = (infoUser) => {
      return ctx.send({
        success: "La modification a bien été enregistrer",
        userInfo: {
          _id: infoUser._id,
          firstname: infoUser.firstname,
          lastname: infoUser.lastname,
          email: infoUser.email,
          phone: infoUser.phone,
          addr: infoUser.addr,
          promo: infoUser.promo,
          isAdmin: infoUser.isAdmin,
        },
      });
    };

    const disconnect = () => {
      ctx.send({
        error: "disconnect",
      });
    };

    const body = ctx.request.body;
    const form = JSON.parse(body.form);
    const operation = body.operation;

    if (body.token != undefined) {
      const decodeToken = jwt_utils.getUserInfo(body.token);
      if (decodeToken != -1) {
        let infouser = await strapi.query("client").findOne({
          _id: decodeToken.userId,
          isAdmin_gt: -1,
        });
        if (["name", "email", "password"].includes(operation)) {
          const correct = await bcrypt.compare(form.pass, infouser.pass);
          if (!correct) {
            return ctx.send({
              error: "Mot de passe incorrect",
            });
          }
        }
        if (
          operation == "name" &&
          infouser.firstname != form.firstname &&
          infouser.lastname != form.lastname
        ) {
          if (!verifyName(form.firstname) || !verifyName(form.lastname)) {
            return ctx.send({
              error:
                "le nom et le prénom doit contenir entre 2 et 30 caractères ",
            });
          }
          infouser.firstname = form.firstname;
          infouser.lastname = form.lastname;
          await strapi.query("client").update(
            {
              _id: decodeToken.userId,
            },
            infouser
          );

          const newInfoUser = await strapi.query("client").findOne({
            _id: decodeToken.userId,
          });
          return success(newInfoUser);
        } else if (operation == "email" && infouser.email != form.email) {
          if (!verifyEmail(form.email)) {
            return ctx.send({
              error: "email invalide ",
            });
          }

          const newInfoUser = await strapi.query("client").findOne({
            _id: decodeToken.userId,
          });
          const token = jwt_utils.generateTokenForUser(newInfoUser, 60 * 15, {
            email: form.email.toLowerCase(),
          });

          sendMeEmailToConfirm(
            newInfoUser.firstname,
            newInfoUser.lastname,
            token,
            form.email
          );
          ctx.send({
            success: `un email de confirmation a été envoyer  à ${form.email}`,
          });
        } else if (operation == "password") {
          if (!verifyPass(form.newPass)) {
            return ctx.send({
              error:
                " Le nouveau mot de passe doit contenir au minimum 8 caractères, une majuscule, un chiffre ",
            });
          }
          const correct = await bcrypt.compare(form.newPass, infouser.pass);
          if (correct) {
            return ctx.send({
              error: " ce mot de passe correspend déjà au votre",
            });
          }

          const hashPassword = await bcrypt.hash(form.newPass, 10);
          infouser.pass = hashPassword;
          await strapi.query("client").update(
            {
              _id: decodeToken.userId,
            },
            infouser
          );

          return ctx.send({
            response: "success",
          });
        } else if (operation == "phone") {
          if (form.phone.phone.length != 9) {
            return ctx.send({
              error: "Le numero de téléphone doit contenir 9 chiffres",
            });
          }
          infouser.phone = [
            form.phone.iso2,
            "+" + +form.phone.dialCode,
            form.phone.phone,
          ];
          await strapi.query("client").update(
            {
              _id: decodeToken.userId,
            },
            infouser
          );

          const newInfoUser = await strapi.query("client").findOne({
            _id: decodeToken.userId,
          });
          return success(newInfoUser);
        } else if (operation == "removePhone") {
          infouser.phone = [];
          await strapi.query("client").update(
            {
              _id: decodeToken.userId,
            },
            infouser
          );

          const newInfoUser = await strapi.query("client").findOne({
            _id: decodeToken.userId,
          });
          return success(newInfoUser);
        } else if (operation == "addr") {
          infouser.addr = [
            form.street,
            form.town,
            form.code,
            form.contry.value + ", " + form.contry.label,
          ];

          await strapi.query("client").update(
            {
              _id: decodeToken.userId,
            },
            infouser
          );

          const newInfoUser = await strapi.query("client").findOne({
            _id: decodeToken.userId,
          });
          return success(newInfoUser);
        } else if (operation == "removeAddr") {
          infouser.addr = [];
          await strapi.query("client").update(
            {
              _id: decodeToken.userId,
            },
            infouser
          );

          const newInfoUser = await strapi.query("client").findOne({
            _id: decodeToken.userId,
          });
          return success(newInfoUser);
        } else {
          ctx.send({
            error: "ces informations sont déjà renseignées ",
          });
        }
      } else {
        disconnect();
      }
    } else {
      disconnect();
    }
  },

  // promo
  promo: async (ctx) => {
    const disconnect = () => {
      ctx.send({
        error: "disconnect",
      });
    };
    const form = JSON.parse(ctx.request.body.form);
    const decodeToken = await jwt_utils.getUserInfo(
      ctx.request.body.token
    );

    if (decodeToken == -1) {
      return disconnect();
    }

    const op = ctx.request.body.operation;
    let infoUser = await strapi.query("client").findOne({
      _id: decodeToken.userId,
    });

    if ((op == "edit" && infoUser.promo.value != 1) || infoUser == null) {
      return disconnect();
    }

    if (form.code) {
      const existentCode = await strapi.query("client").model.findOne({
        "promo.code": form.code.toUpperCase(),
        _id: {
          $ne: infoUser._id,
        },
      });
      if (existentCode != null) {
        return ctx.send({
          error: `le code créateur ${form.code} existe déjà`,
        });
      }
    }
    const newPromo = {
      value: op == "ask" ? 0 : 1,
      media: form.media ? form.media : "-",
      payment: form.payment ? form.payment : "-",
      code: form.code ? form.code.toUpperCase() : (infoUser._id).toUpperCase(),
      solde: infoUser.promo.solde ? infoUser.promo.solde : 10,
      benef: infoUser.promo.benef ? infoUser.promo.benef : 10,
      money: {
        actual: infoUser.promo.money.actual ? infoUser.promo.money.actual : 0,
        total: infoUser.promo.money.total ? infoUser.promo.money.total : 0,
        askToPay: infoUser.promo.money.askToPay
          ? infoUser.promo.money.askToPay
          : false,
      },
    };
    infoUser.promo = newPromo;
    await strapi.query("client").update(
      {
        _id: infoUser._id,
      },
      {
        $set: {
          promo: newPromo,
        },
      }
    );

    return ctx.send({
      success: newPromo,
    });
  },

  // see code pursentage
  promoPurcent: async (ctx) => {
    const code = ctx.params.code;
    const zero = () => {
      return ctx.send({
        reduction: 0,
      });
    };
    if (code) {
      const infoUser = await strapi.query("client").model.findOne({
        "promo.value": 1,
        "promo.code": code,
      });

      if (infoUser) {
        return ctx.send({
          reduction: infoUser.promo.solde,
        });
      } else {
        return zero();
      }
    } else {
      return zero();
    }
  },

  // payme
  promoPayMe: async (ctx) => {
    const decodeToken = await jwt_utils.getUserInfo(
      ctx.request.body.token
    );

    let infoUser = await strapi.query("client").findOne({
      _id: decodeToken.userId,
    });
    if (
      infoUser.promo.money.actual > 50 ||
      infoUser.promo.money.askToPay == false
    ) {
      await strapi.query("client").update(
        {
          _id: infoUser._id,
        },
        {
          $set: {
            "promo.money.askToPay": true,
          },
        }
      );
      return ctx.send({
        response: "success",
      });
    }
  },

  // eet Affiliation Info (Ask to pau  + affiliation demande  )
  getAffiliationProgramInfo: async (ctx) => {
    const disconnect = () => {
      return ctx.send({
        error: "disconnect",
      });
    };

    const token = ctx.params.token;
    const decode_token = await jwt_utils.getUserInfo(token);

    if (decode_token == -1) {
      return disconnect();
    }
    const adminExist = await strapi.query("client").findOne({
      _id: decode_token.userId,
      isAdmin: 1,
    });
    if (adminExist) {
      const Affiliates = await strapi.query("client").model.find(
        {
          "promo.value": {
            $gt: -1,
          },
        },
        ["_id", "firstname", "lastname", "email", "phone", "promo"]
      );

      const AskToPay = await strapi.query("client").model.find(
        {
          "promo.money.askToPay": true,
        },
        ["_id", "firstname", "lastname", "email", "phone", "promo"]
      );
      return ctx.send({
        Affiliates: Affiliates,
        AskToPay: AskToPay,
      });
    } else {
      return disconnect();
    }
  },
  //  admin  change   user
  adminChengeUser: async (ctx) => {
    const disconnect = () => {
      return ctx.send({
        error: "disconnect",
      });
    };

    const op = ctx.request.body.op;
    const token = ctx.request.body.token;
    const idUser = ctx.request.body.idUser;
    const decode_token = await jwt_utils.getUserInfo(JSON.parse(token));

    if (decode_token == -1) {
      return disconnect();
    }
    const adminExist = await strapi.query("client").findOne({
      _id: decode_token.userId,
      isAdmin: 1,
    });
    if (adminExist) {
      const user = await strapi.query("client").findOne({
        _id: idUser,
      });

      if (user) {
        if (op == "delete" || op == "accept") {
          await strapi.query("client").update(
            {
              _id: user._id,
            },
            {
              $set: {
                "promo.value": op == "delete" ? -1 : 1,
              },
            }
          );
        } else if (op == "pay") {
          await strapi.query("client").update(
            {
              _id: user._id,
            },
            {
              $set: {
                "promo.money.actual": 0,
                "promo.money.askToPay": false,
              },
            }
          );
        }
      }

      const Affiliates = await strapi.query("client").model.find(
        {
          "promo.value": {
            $gt: -1,
          },
        },
        ["_id", "firstname", "lastname", "email", "phone", "promo"]
      );

      const AskToPay = await strapi.query("client").model.find(
        {
          "promo.money.askToPay": true,
        },
        ["_id", "firstname", "lastname", "email", "phone", "promo"]
      );
      return ctx.send({
        Affiliates: Affiliates,
        AskToPay: AskToPay,
      });
    } else {
      return disconnect();
    }
  },
  sendNewsletter: async (ctx) => {
    const disconnect = () => {
      return ctx.send({
        error: "disconnect",
      });
    };

    const token = ctx.request.body.token;
    const obj = ctx.request.body.obj;
    const bodyMail = ctx.request.body.bodyMail;

    const decode_token = await jwt_utils.getUserInfo(token);

    if (decode_token == -1) {
      return disconnect();
    }

    const adminExist = await strapi.query("client").findOne({
      _id: decode_token.userId,
      isAdmin: 1,
    });
    if (adminExist) {
      const allUsersEmails = await strapi
        .query("client")
        .model.find({}, ["email"]);
      allUsersEmails.map((i) =>
        sendEmail(i.email, obj, bodyMail, config.email.newsletter)
      );
      return ctx.send({
        success: `email envoyé à ${allUsersEmails.length} Clients`,
      });
    } else {
      return disconnect();
    }
  },
};
