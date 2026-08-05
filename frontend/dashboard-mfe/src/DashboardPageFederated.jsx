import { AuthProvider } from '../../shared/authContext.jsx'
import DashboardPageRaw from './DashboardPage'

export default function DashboardPage(props) {
  return (
    <AuthProvider>
      <DashboardPageRaw {...props} />
    </AuthProvider>
  )
}
