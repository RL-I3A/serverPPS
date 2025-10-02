require('dotenv').config();
const express = require('express');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const nodemailer = require('nodemailer');

const app = express();
app.use(cors({ origin: process.env.STATIC_SITE }));

const STATIC_SITE = process.env.STATIC_SITE;

// Nodemailer pour envoyer les mails
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Middleware pour Stripe webhook (raw body)
app.use('/webhook', express.raw({ type: 'application/json' }));

// Créer une session Stripe
app.post('/create-checkout-session', express.json(), async (req, res) => {
  const email = req.body.email;
  if (!email) return res.status(400).json({ error: 'Email manquant' });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: { name: 'Accès Pokédex' },
          unit_amount: 260,
        },
        quantity: 1,
      }],
      mode: 'payment',
      customer_email: email,
      success_url: `${STATIC_SITE}/personalizedDex.html?access_token={CHECKOUT_SESSION_ID}`,
      cancel_url: `${STATIC_SITE}/payment-cancel.html`,
    });
    res.json({ id: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Webhook Stripe pour envoi d'email
app.post('/webhook', (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.log('⚠️  Signature webhook invalide', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const accessToken = session.id;
    const email = session.customer_email;

    const mailOptions = {
      from: `"PokéBinderDex" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Your PersonalizedDex Access',
      text: `Thanks for your PersonalizedDex purchase!\n\nHere’s your access link in case you close the tab by mistake:\n\n${STATIC_SITE}/personalizedDex.html?access_token=${accessToken}\n\n⚠️ The link will remain valid for only a few dozen minutes.`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) console.log('Erreur envoi mail:', error);
      else console.log('Mail envoyé:', info.response);
    });
  }

  res.json({ received: true });
});

// Vérifier le token pour TESTPAY.html
app.get('/validate-token', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.json({ valid: false });

  try {
    const session = await stripe.checkout.sessions.retrieve(token);
    if (session.payment_status === 'paid') return res.json({ valid: true });
    return res.json({ valid: false });
  } catch {
    return res.json({ valid: false });
  }
});

// Lancer serveur
app.listen(process.env.PORT, () => console.log(`Server running on port ${process.env.PORT}`));
