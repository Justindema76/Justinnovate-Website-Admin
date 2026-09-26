import { requireWebsiteOwner } from '../../_shared/auth.js';
import { allowOnly, clean, parseSupabase, readBody, validUuid } from '../../_shared/http.js';
import { supabaseAnonKey, supabaseUrl, supabaseUserRest } from '../../_shared/supabase.js';

const SELECT = 'id,service_request_id,created_at,sent_at,to_email,cc_emails,bcc_emails,from_email,subject,body_text,attachments,delivery_status,delivery_error,provider_message_id';

export default async function handler(req, res) {
  const owner = await requireWebsiteOwner(req, res);
  if (!owner) return;
  if (!allowOnly(req, res, ['GET','POST'])) return;

  if (req.method === 'GET') {
    const requestId = clean(req.query?.requestId, 80);
    if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });

    try {
      const emails = await parseSupabase(
        await supabaseUserRest(
          owner.accessToken,
          `service_request_emails?service_request_id=eq.${encodeURIComponent(requestId)}&select=${encodeURIComponent(SELECT)}&order=created_at.desc&limit=200`,
          { method: 'GET' },
        ),
        'Unable to load email history.',
      );
      return res.status(200).json({ emails: Array.isArray(emails) ? emails : [] });
    } catch (error) {
      console.error('[justindematteis] service request emails GET failed', error);
      return res.status(500).json({ error: 'Unable to load email history.' });
    }
  }

  const body = readBody(req);
  const requestId = clean(body.requestId, 80);
  if (!validUuid(requestId)) return res.status(400).json({ error: 'A valid request ID is required.' });

  try {
    const response = await fetch(`${supabaseUrl()}/functions/v1/send-site-email`, {
      method: 'POST',
      headers: {
        apikey: supabaseAnonKey(),
        Authorization: `Bearer ${owner.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'service_reply',
        requestId,
        subject: clean(body.subject, 240),
        message: clean(body.message, 12000),
        ccEmails: body.ccEmails || '',
        bccEmails: body.bccEmails || '',
        attachments: Array.isArray(body.attachments) ? body.attachments.slice(0, 5) : [],
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status === 400 ? 400 : 502)
        .json({ error: payload?.error || 'Unable to send email.' });
    }
    return res.status(200).json(payload);
  } catch (error) {
    console.error('[justindematteis] service request email POST failed', error);
    return res.status(502).json({ error: 'Unable to send email.' });
  }
}
