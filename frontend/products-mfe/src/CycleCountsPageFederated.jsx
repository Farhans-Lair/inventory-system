import { AuthProvider } from '../../shared/authContext.jsx'
import CycleCountsPageRaw from './CycleCountsPage'

export default function CycleCountsPage(props) {
  return (
    <AuthProvider>
      <CycleCountsPageRaw {...props} />
    </AuthProvider>
  )
}
