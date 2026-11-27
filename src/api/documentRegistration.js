async function unavailable() {
  throw new Error('Document registration API contract is not configured.');
}

// Confirmed endpoints will be implemented here with the shared Axios client.
export const documentRegistrationApi = {
  upload: unavailable,
  save: unavailable,
  startAnalysis: unavailable,
};
