import { AuthProvider } from './authContext'
import CycleCountsPageRaw from './CycleCountsPage'

export default function CycleCountsPage(props) {
  return (
    <AuthProvider>
      <CycleCountsPageRaw {...props} />
    </AuthProvider>
  )
}
