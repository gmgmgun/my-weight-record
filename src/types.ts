export type ISODate = string

export type Entry = {
  date: ISODate
  weightKg: number
  memo?: string
  updatedAt: number
}

export type Settings = {
  goalKg?: number
  startDate?: ISODate
  startKg?: number
  lastBackupAt?: number
  firstUseAt?: number
}
