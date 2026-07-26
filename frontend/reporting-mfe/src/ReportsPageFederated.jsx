import { AuthProvider } from './authContext'
import ReportsPageRaw from './ReportsPage'

export default function ReportsPage(props) {
  return (
    <AuthProvider>
      <ReportsPageRaw {...props} />
    </AuthProvider>
  )
}
