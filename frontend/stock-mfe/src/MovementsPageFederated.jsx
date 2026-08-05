import { AuthProvider } from '../../shared/authContext.jsx'
import MovementsPageRaw from './MovementsPage'

export default function MovementsPage(props) {
  return (
    <AuthProvider>
      <MovementsPageRaw {...props} />
    </AuthProvider>
  )
}
