# Mimi Food: payments and email setup

Do these in order. Start in Square's **sandbox** (fake money), test, then go live.
Never paste keys into chat or commit them. Keep them in your own environment variables
(local) or in Render's Environment page (hosted).

## 1. Square (card payments)

1. Create a Square account at squareup.com, then open developer.squareup.com and create an application.
2. In the application, with **Sandbox** chosen, copy:
   - Access token → `SQUARE_ACCESS_TOKEN`
   - Application ID → `SQUARE_APPLICATION_ID`
   - Location ID (Locations tab) → `SQUARE_LOCATION_ID`
3. Set `SQUARE_ENVIRONMENT=sandbox`.
4. Webhooks → Add subscription. URL: `https://<your-site>/api/square/webhook`.
   Events: `invoice.payment_made`, `refund.created`, `refund.updated`, `subscription.updated`, `payment.updated`.
   Copy its signature key → `SQUARE_WEBHOOK_SIGNATURE_KEY`.
   (Webhooks need a public address, so skip this step while testing on your computer.)
5. Test with Square's sandbox test card 4111 1111 1111 1111, any future date, any CVV and ZIP.

## 2. Email (order confirmations, tracking)

1. Create a Resend account at resend.com and verify the domain you send from (for example mimifoodusa.com).
2. Set `RESEND_API_KEY` and `EMAIL_FROM` (an address on that domain, for example `Mimi Food <cs@mimifoodusa.com>`).
3. Set `SITE_URL` to the public address of the site.

## 3. Shipping rates and labels (optional)

Create a Shippo account and set `SHIPPO_API_TOKEN`. Without it, shipping is the flat $5.95.

## 4. Going live

1. In Square, switch to **Production**: copy the production access token, application ID and location ID,
   set `SQUARE_ENVIRONMENT=production`, and add the webhook again with its new signature key.
2. Set `ADMIN_KEY` to a long random value (never reuse a test value online).
3. Deploy (render.yaml is included) and set the same variables in Render.

## Run locally with your keys

Set the variables in your own PowerShell session, then run `./start-local.ps1`. It refuses to start if
the admin key is missing and shows which payment and email pieces are connected.
