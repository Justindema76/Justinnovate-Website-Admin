import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, clean, readBody, validUuid } from '../../_shared/http.js';
import { supabaseAnonKey, supabaseUrl, supabaseUserRest } from '../../_shared/supabase.js';

const SELECT = 'id,demo_request_id,created_at,sent_at,to_email,cc_emails,bcc_emails,from_email,subject,body_text,delivery_status,delivery_error,provider_message_id';

function cleanEmailList(value) {
  const values = Array.isArray(value) ? value : String(value || '').split(',');
  return values.map(item => clean(item, 320).toLowerCase()).filter(Boolean).slice(0, 10);
}

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST'])) return;

  if (req.method === 'GET') {
    const requestId = clean(req.query?.requestId, 80);
    if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });

    try {
      const response = await supabaseUserRest(
        owner.accessToken,
        `demo_request_emails?demo_request_id=eq.${encodeURIComponent(requestId)}&select=${encodeURIComponent(SELECT)}&order=created_at.desc&limit=100`,
        { method: 'GET' },
      );
      const payload = await response.json().catch(() => []);
      if (!response.ok) return res.status(500).json({ error: 'Unable to load email history.' });
      return res.status(200).json({ emails: Array.isArray(payload) ? payload : [] });
    } catch (error) {
      console.error('[justconsignin] demo request emails GET failed', error);
      return res.status(500).json({ error: 'Unable to load email history.' });
    }
  }

  const body = readBody(req);
  const requestId = clean(body.requestId, 80);
  const subject = clean(body.subject, 240);
  const message = clean(body.message, 12000);

  if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });
  if (!subject) return res.status(400).json({ error: 'Subject is required.' });
  if (!message) return res.status(400).json({ error: 'Message is required.' });

  try {
    const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey(),
        Authorization: `Bearer ${owner.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'reply',
        requestId,
        subject,
        message,
        ccEmails: cleanEmailList(body.ccEmails),
        bccEmails: cleanEmailList(body.bccEmails),
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ error: payload?.error || 'Unable to send email.' });
    return res.status(200).json(payload);
  } catch (error) {
    console.error('[justconsignin] demo request email POST failed', error);
    return res.status(502).json({ error: 'Unable to send email.' });
  }
}
