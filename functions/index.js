import { initializeApp } from 'firebase-admin/app'
import { onValueCreated } from 'firebase-functions/v2/database'
import { defineSecret } from 'firebase-functions/params'
import emailjs from '@emailjs/nodejs'

initializeApp()

const EMAILJS_SERVICE_ID = defineSecret('EMAILJS_SERVICE_ID')
const EMAILJS_TEMPLATE_ID_ADMIN = defineSecret('EMAILJS_TEMPLATE_ID_ADMIN')
const EMAILJS_PUBLIC_KEY = defineSecret('EMAILJS_PUBLIC_KEY')
const MAIL_TO = defineSecret('MAIL_TO')
const EMAILJS_PRIVATE_KEY = defineSecret('EMAILJS_PRIVATE_KEY')

function safe(value, fallback = '-') {
  const text = value == null ? '' : String(value).trim()
  return text || fallback
}

function formatMoney(value) {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '-'
  return `${amount.toFixed(2)} EUR`
}

function formatLength(value) {
  const length = Number(value)
  if (!Number.isFinite(length)) return '-'
  return `${length.toFixed(2)} mm`
}

export const emailAdminOnNewRequest = onValueCreated(
  {
    ref: '/requests/{requestId}',
    region: 'europe-west1',
    secrets: [
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID_ADMIN,
      EMAILJS_PUBLIC_KEY,
      MAIL_TO,
      EMAILJS_PRIVATE_KEY,
    ],
  },
  async (event) => {
    const requestId = event.params.requestId
    const data = event.data.val() || {}

    const serviceId = EMAILJS_SERVICE_ID.value().trim()
    const templateId = EMAILJS_TEMPLATE_ID_ADMIN.value().trim()
    const publicKey = EMAILJS_PUBLIC_KEY.value().trim()
    const privateKey = EMAILJS_PRIVATE_KEY.value().trim()
    const to = MAIL_TO.value().trim()

    if (!serviceId || !templateId || !publicKey || !privateKey || !to) {
      console.warn('Mail niet verstuurd: EmailJS variabelen ontbreken.')
      return
    }

    const requestNumber = safe(data.requestNumber, requestId)
    const customerName = safe(data.customerProfile?.name || data.customerProfile?.company)
    const customerEmail = safe(data.customerEmail)
    const status = safe(data.status, 'nieuw')
    const createdAt = safe(data.createdAt)
    const materialName = safe(data.material?.materiaal)
    const totalLength = formatLength(data.totalLength)
    const quantity = safe(data.aantalStuks, '1')
    const totalPrice = formatMoney(data.totaalPrijs)

    const subject = `Nieuwe aanvraag ${requestNumber}`
    const message = [
      'Er is een nieuwe aanvraag binnengekomen in BendR.',
      '',
      `Aanvraagnummer: ${requestNumber}`,
      `Request ID: ${requestId}`,
      `Status: ${status}`,
      `Aangemaakt op: ${createdAt}`,
      `Klant: ${customerName}`,
      `E-mail klant: ${customerEmail}`,
      `Materiaal: ${materialName}`,
      `Totale lengte: ${totalLength}`,
      `Aantal stuks: ${quantity}`,
      `Totaalprijs: ${totalPrice}`,
      '',
      'Deze mail is automatisch verzonden door Firebase Functions.',
    ].join('\n')

    try {
      const result = await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: to,
          subject,
          request_number: requestNumber,
          request_id: requestId,
          status,
          created_at: createdAt,
          customer_name: customerName,
          customer_email: customerEmail,
          material_name: materialName,
          total_length: totalLength,
          quantity,
          total_price: totalPrice,
          message,
        },
        {
          publicKey,
          privateKey,
        },
      )
      console.log('EmailJS mail verstuurd via SMTP-service:', serviceId, result.status, result.text)
    } catch (error) {
      console.error(
        'EmailJS fout:',
        error?.status,
        error?.text || error?.message,
        `(service=${serviceId}, template=${templateId})`,
      )
      throw error
    }
  },
)
