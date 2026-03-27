exports.handler = async function handler(event) {
  return {
    statusCode: 200,
    body: JSON.stringify({
      ok: false,
      message: 'Esta función es un placeholder. Para enviar WhatsApp automático desde Netlify necesitas conectar una API externa como Meta WhatsApp Cloud API, Twilio o UltraMsg con credenciales propias.'
    })
  };
};
