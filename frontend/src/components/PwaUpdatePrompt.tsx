import { useState, type ReactNode } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { SaveResult } from '../persistence/workspaceStorage'
import Toast from './Toast'

interface PwaUpdatePromptProps {
  readonly onBeforeUpdate: () => SaveResult
  readonly fallback?: ReactNode
}

const UPDATE_MESSAGE = 'A new version is available.'
const UNSAVED_MESSAGE = "Your latest changes couldn't be saved. Reload anyway?"

function ignoreRegistrationError(): void {
  // spec §6.3: when registration fails the app keeps working as a normal website.
}

export default function PwaUpdatePrompt({ onBeforeUpdate, fallback = null }: PwaUpdatePromptProps) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({ onRegisterError: ignoreRegistrationError })
  const [confirmingUnsaved, setConfirmingUnsaved] = useState(false)

  if (!needRefresh) return <>{fallback}</>

  const activateUpdate = () => {
    void updateServiceWorker(true)
  }

  if (confirmingUnsaved) {
    return (
      <Toast
        message={UNSAVED_MESSAGE}
        actions={[
          { label: 'Reload anyway', onClick: activateUpdate },
          { label: 'Cancel', onClick: () => setConfirmingUnsaved(false) },
        ]}
      />
    )
  }

  const saveThenUpdate = () => {
    if (onBeforeUpdate().ok) {
      activateUpdate()
    } else {
      setConfirmingUnsaved(true)
    }
  }

  return (
    <Toast
      message={UPDATE_MESSAGE}
      actions={[
        { label: 'Reload', onClick: saveThenUpdate },
        { label: 'Later', onClick: () => setNeedRefresh(false) },
      ]}
    />
  )
}
