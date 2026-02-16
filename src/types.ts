/** Cloudflare Worker bindings */
export interface Bindings {
  EXCHANGE_KV: KVNamespace;
  EXCHANGE_BUCKET: R2Bucket;
}

/** Stored in KV as exchange metadata */
export interface ExchangeMetadata {
  passcodeHash?: string;
  exp: number;
  attempts: number;
  label?: string;
  createdAt: number;
  trusted: boolean;
  iss?: string;
}

/** Shape of the link payload (base64url-encoded in the bindx:// URI) */
export interface LinkPayload {
  url: string;
  key: string;
  exp: number;
  flag: string;
  label?: string;
}

/** POST /exchange request body */
export interface CreateExchangeRequest {
  payload: string;
  passcode?: string;
  label?: string;
  exp?: number;
  proof?: string;
}

/** POST /exchange response body */
export interface CreateExchangeResponse {
  url: string;
  exp: number;
  flag: string;
  passcode?: string;
  trusted: boolean;
  iss?: string;
}

/** POST /exchange/:id/manifest.json request body */
export interface RetrieveManifestRequest {
  recipient: string;
  passcode?: string;
}

/** POST /exchange/:id/manifest.json response body */
export interface ManifestResponse {
  files: ManifestFile[];
}

export interface ManifestFile {
  contentType: string;
  embedded: string;
}
