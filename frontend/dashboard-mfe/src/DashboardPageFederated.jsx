import { AuthProvider } from './authContext'
import DashboardPageRaw from './DashboardPage'

export default function DashboardPage(props) {
  return (
    <AuthProvider>
      <DashboardPageRaw {...props} />
    </AuthProvider>
  )
}
