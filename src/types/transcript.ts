export type SpeakerRole = "agent" | "customer" | "unknown";

export type Utterance = {
  speaker: SpeakerRole;
  text: string;
  startMs: number | null;
  endMs: number | null;
};

export type WordTiming = {
  word: string;
  startMs: number;
  endMs: number;
  speaker?: SpeakerRole;
};

export type CrmFields = {
  email?: string;
  phone?: string;
  planPromoPrice?: number;
  planRegularPrice?: number;
  downloadMbps?: number;
  uploadMbps?: number;
  modemModel?: string;
  currentProvider?: string;
  providerSold?: string;
  serviceAddress?: string;
  deliveryAddress?: string;
  [key: string]: unknown;
};
