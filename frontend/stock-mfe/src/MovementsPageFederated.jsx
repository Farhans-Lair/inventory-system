import { AuthProvider } from './authContext'
import MovementsPageRaw from './MovementsPage'

export default function MovementsPage(props) {
  return (
    <AuthProvider>
      <MovementsPageRaw {...props} />
    </AuthProvider>
  )
}
