/**
 * Plugin boundary between the CRM and any inbound enquiry channel (website
 * form today, WhatsApp/other channels later). A source turns whatever it
 * receives into this one shape; ingest.ts turns that shape into an enquiry
 * + message row. A second channel only ever needs to produce this payload —
 * see the PbxConnector/AuthProvider interfaces for the same pattern.
 */
export interface InboundEnquiryPayload {
  channel: string;
  senderName?: string;
  senderContact: string;
  subject?: string;
  body: string;
  /** The source's own id for this message, if it has one (dedup hook for
   * channels that may redeliver, e.g. a webhook retry). Unused for now. */
  externalId?: string;
}
