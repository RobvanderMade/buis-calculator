# Firebase e-mail bij nieuwe aanvraag (EmailJS)

Deze functie verstuurt automatisch een e-mail naar admin via EmailJS zodra er een nieuwe aanvraag wordt aangemaakt in Realtime Database onder `requests/{requestId}`.

De mail gaat via je **EmailJS SMTP-service** (bijv. `service_u7hg503` / Bendr). SMTP-host, poort en inloggegevens stel je in bij EmailJS onder **Email Services**, niet in deze code.

## 1) Dependencies installeren

Voer uit in de map `functions`:

```bash
npm install
```

## 2) Secrets instellen

Stel alle waarden als secret in:

```bash
firebase functions:secrets:set EMAILJS_SERVICE_ID
firebase functions:secrets:set EMAILJS_TEMPLATE_ID_ADMIN
firebase functions:secrets:set EMAILJS_PUBLIC_KEY
firebase functions:secrets:set MAIL_TO
firebase functions:secrets:set EMAILJS_PRIVATE_KEY
```

## 3) Deploy

Vanaf de project-root:

```bash
firebase deploy --only functions
```

## 4) Benodigde secrets

- `EMAILJS_SERVICE_ID`
- `EMAILJS_TEMPLATE_ID_ADMIN`
- `EMAILJS_PUBLIC_KEY`
- `MAIL_TO`
- `EMAILJS_PRIVATE_KEY`

Zorg dat deze waarden in je Firebase project gezet zijn (CLI of Console), anders logt de functie een waarschuwing en wordt er geen mail verstuurd.

## 5) EmailJS template variabelen

Gebruik in je admin-template minimaal deze variabelen:

- `to_email` — koppel in het template aan het **To Email**-veld (ontvanger)
- `subject` — onderwerp
- `message` — inhoud

Beschikbaar voor detailweergave:

- `request_number`
- `request_id`
- `status`
- `created_at`
- `customer_name`
- `customer_email`
- `material_name`
- `total_length`
- `quantity`
- `total_price`
