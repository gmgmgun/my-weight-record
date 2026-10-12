type PersistApi = Pick<StorageManager, 'persist' | 'persisted'>

// 저장 공간이 부족할 때 브라우저가 IndexedDB를 지우지 않도록 영구 저장을 요청한다.
export async function requestPersistence(
  storage: PersistApi | undefined = typeof navigator === 'undefined' ? undefined : navigator.storage,
): Promise<boolean> {
  try {
    if (!storage?.persist || !storage.persisted) return false
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    return false
  }
}
