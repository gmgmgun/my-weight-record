type Props = { reason: 'version-change' | 'blocked'; onReload: () => void }

const MESSAGES = {
  'version-change': {
    title: '새 버전이 준비됐어요',
    body: '저장 방식이 바뀐 새 버전이 다른 창에서 열렸습니다. 다시 불러오면 새 버전으로 이어서 쓸 수 있어요.',
  },
  blocked: {
    title: '새 버전으로 바꾸는 중이에요',
    body: '다른 창이나 탭에 열려 있는 이 앱을 닫아 주세요. 닫으면 자동으로 이어집니다.',
  },
} as const

export function ReloadNotice({ reason, onReload }: Props) {
  const m = MESSAGES[reason]
  return (
    <main className="unavailable">
      <div role="alert" className="card">
        <h1>{m.title}</h1>
        <p>{m.body}</p>
        <button type="button" className="primary" onClick={onReload}>
          다시 불러오기
        </button>
      </div>
    </main>
  )
}
