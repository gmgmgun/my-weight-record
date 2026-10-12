export function StorageUnavailable() {
  return (
    <main className="unavailable">
      <div role="alert" className="card">
        <h1>몸무게 기록</h1>
        <p>이 브라우저 모드에서는 기록을 저장할 수 없습니다.</p>
        <p className="muted">사생활 보호(시크릿) 모드를 끄거나 다른 브라우저에서 열어 주세요.</p>
      </div>
    </main>
  )
}
