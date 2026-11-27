async function unavailable() {
  throw new Error('Question selection API contract is not configured.');
}

// Replace these adapters with the shared Axios client when the endpoints are agreed.
export const questionSelectionApi = {
  list: unavailable,
  evidence: unavailable,
  validate: unavailable,
  save: unavailable,
};
