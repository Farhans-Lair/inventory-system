import { AuthProvider } from '../../shared/authContext.jsx'
import ReportsPageRaw from './ReportsPage'

export default function ReportsPage(props) {
  return (
    <AuthProvider>
      <ReportsPageRaw {...props} />
    </AuthProvider>
  )
}
