module.exports = ({ env }) => ({
  host: env('HOST', '0.0.0.0'),
  port: env.int('PORT', 1337),
  admin: {
    auth: {
      secret: env('ADMIN_JWT_SECRET', 'sosso_21nabilsalfisaaxel11_pas_dinspiration_papapapa_kalashnikov47'),
    },
  },
});
