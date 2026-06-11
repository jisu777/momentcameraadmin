import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell home">
      <section className="hero">
        <p className="eyebrow">Moment Camera</p>
        <h1>License Admin</h1>
        <p>
          16자리 초대 코드와 기기 인증 상태를 관리하는 전용 관리자 사이트입니다.
          앱에는 전체 코드 목록이 들어가지 않고, 서버에서만 검증합니다.
        </p>
        <Link className="primary" href="/admin">관리자 페이지 열기</Link>
      </section>
    </main>
  );
}
