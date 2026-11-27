// 계약 확정 후 공통 Axios 클라이언트로 인증하고 세션을 설정한다.
// 성공 후 이동은 화면에서 전달한 콜백이 처리한다.
// 자격 증명 불일치는 서버 응답을 화면 내부 코드 INVALID_CREDENTIALS로 변환한다.
export async function login() {
  throw new Error('Authentication API contract is not configured.');
}
